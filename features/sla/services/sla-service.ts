import type { Prisma, SlaPolicy } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

export type SlaStatus = {
  firstResponseDue: string | null;
  resolutionDue: string | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
};

const defaultPolicies = [
  {
    name: "Urgent",
    priority: "urgent",
    firstResponseMinutes: 30,
    resolutionMinutes: 240,
  },
  {
    name: "High",
    priority: "high",
    firstResponseMinutes: 60,
    resolutionMinutes: 480,
  },
  {
    name: "Normal",
    priority: "normal",
    firstResponseMinutes: 240,
    resolutionMinutes: 1440,
  },
  {
    name: "Low",
    priority: "low",
    firstResponseMinutes: 480,
    resolutionMinutes: 2880,
  },
] as const;

async function tenantWhere(
  organizationId: string,
): Promise<Prisma.TicketWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function policyTenantWhere(organizationId: string) {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function findPolicy(organizationId: string, priority: string) {
  const exact = await prisma.slaPolicy.findFirst({
    where: { organizationId, priority },
  });
  if (exact) return exact;

  if (!(await isLegacyOrganization(organizationId))) return null;

  return prisma.slaPolicy.findFirst({
    where: { organizationId: null, priority },
  });
}

export async function getSlaStatus(
  organizationId: string,
  ticketId: string,
): Promise<SlaStatus | null> {
  const includeLegacy = await isLegacyOrganization(organizationId);
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...(await tenantWhere(organizationId)) },
    include: {
      messages: {
        where: includeLegacy
          ? { OR: [{ organizationId }, { organizationId: null }] }
          : { organizationId },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return null;

  const policy = await findPolicy(organizationId, ticket.priority);
  if (!policy) return null;

  const createdAt = ticket.createdAt.getTime();
  const now = Date.now();
  const firstResponseDue = new Date(
    createdAt + policy.firstResponseMinutes * 60_000,
  );
  const resolutionDue = new Date(createdAt + policy.resolutionMinutes * 60_000);
  const hasResponse = ticket.messages.some(
    (message) => message.author !== "customer",
  );
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return {
    firstResponseDue: hasResponse ? null : firstResponseDue.toISOString(),
    resolutionDue: isResolved ? null : resolutionDue.toISOString(),
    firstResponseBreached: !hasResponse && now > firstResponseDue.getTime(),
    resolutionBreached: !isResolved && now > resolutionDue.getTime(),
  };
}

export async function getAllSlaPolicies(
  organizationId: string,
): Promise<SlaPolicy[]> {
  const policies = await prisma.slaPolicy.findMany({
    where: await policyTenantWhere(organizationId),
    orderBy: { firstResponseMinutes: "asc" },
  });

  const byPriority = new Map<string, SlaPolicy>();
  for (const policy of policies) {
    const current = byPriority.get(policy.priority);
    if (!current || policy.organizationId === organizationId) {
      byPriority.set(policy.priority, policy);
    }
  }

  return [...byPriority.values()].sort(
    (left, right) => left.firstResponseMinutes - right.firstResponseMinutes,
  );
}

export async function updateSlaPolicy(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  data: { firstResponseMinutes: number; resolutionMinutes: number };
}) {
  const existing = await prisma.slaPolicy.findFirst({
    where: {
      id: input.id,
      ...(await policyTenantWhere(input.organizationId)),
    },
  });
  if (!existing) throw new Error("Policy not found");

  const policy = await prisma.slaPolicy.update({
    where: { id: existing.id },
    data: {
      organizationId: input.organizationId,
      ...input.data,
    },
  });

  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        actorType: "user",
        action: "sla.policy.updated",
        targetType: "sla-policy",
        targetId: policy.id,
        metadata: {
          priority: policy.priority,
          firstResponseMinutes: policy.firstResponseMinutes,
          resolutionMinutes: policy.resolutionMinutes,
        },
      },
    });
  } catch (error) {
    console.error("Failed to record SLA audit event", error);
  }

  return policy;
}

export async function seedSlaPolicies(organizationId: string) {
  const includeLegacy = await isLegacyOrganization(organizationId);

  for (const policy of defaultPolicies) {
    const existing = await prisma.slaPolicy.findFirst({
      where: {
        priority: policy.priority,
        ...(includeLegacy
          ? { OR: [{ organizationId }, { organizationId: null }] }
          : { organizationId }),
      },
    });

    if (!existing) {
      await prisma.slaPolicy.create({
        data: { organizationId, ...policy },
      });
      continue;
    }

    if (!existing.organizationId) {
      await prisma.slaPolicy.update({
        where: { id: existing.id },
        data: { organizationId },
      });
    }
  }
}
