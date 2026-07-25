import { hashPassword } from "@/features/auth/services/password-service";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

type OrganizationRole = "admin" | "supervisor" | "agent";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function recordUserAudit(input: {
  organizationId: string;
  actorUserId: string;
  action: string;
  targetUserId: string;
  metadata?: Record<string, string | boolean>;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        actorType: "user",
        action: input.action,
        targetType: "user",
        targetId: input.targetUserId,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to record user management audit event", error);
  }
}

async function getActiveMembership(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  return membership?.status === "active" ? membership : null;
}

async function assertAdminInvariant(input: {
  organizationId: string;
  membership: { role: string };
  nextRole?: OrganizationRole;
}) {
  if (input.membership.role !== "admin" || input.nextRole === "admin") return;

  const adminCount = await prisma.organizationMember.count({
    where: {
      organizationId: input.organizationId,
      role: "admin",
      status: "active",
    },
  });

  if (adminCount <= 1) {
    throw new Error("Organization must keep at least one active admin");
  }
}

export async function listUsers(
  organizationId: string,
): Promise<UserSummary[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { organizationId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { userId: true, role: true },
  });

  const users = await prisma.user.findMany({
    where: {
      id: { in: memberships.map((membership) => membership.userId) },
      status: "active",
    },
    select: userSummarySelect,
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return memberships.flatMap((membership) => {
    const user = usersById.get(membership.userId);
    return user ? [{ ...user, role: membership.role }] : [];
  });
}

export async function getUserById(
  organizationId: string,
  id: string,
): Promise<UserSummary | null> {
  const membership = await getActiveMembership(organizationId, id);
  if (!membership) return null;

  const user = await prisma.user.findFirst({
    where: { id, status: "active" },
    select: userSummarySelect,
  });

  return user ? { ...user, role: membership.role } : null;
}

export async function createUser(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
  email: string;
  password: string;
  role: OrganizationRole;
}): Promise<UserSummary> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.status !== "active") {
      throw new Error("User account is inactive");
    }

    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: existing.id,
        },
      },
    });

    if (existingMembership?.status === "active") {
      throw new Error("User already belongs to organization");
    }

    if (existingMembership) {
      await prisma.organizationMember.update({
        where: { id: existingMembership.id },
        data: { status: "active", role: input.role },
      });
    } else {
      await prisma.organizationMember.create({
        data: {
          organizationId: input.organizationId,
          userId: existing.id,
          role: input.role,
          status: "active",
        },
      });
    }

    if (!existing.defaultOrganizationId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { defaultOrganizationId: input.organizationId },
      });
    }

    await recordUserAudit({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "organization.user.added",
      targetUserId: existing.id,
      metadata: { role: input.role, reusedIdentity: true },
    });

    return {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: input.role,
      createdAt: existing.createdAt,
    };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      defaultOrganizationId: input.organizationId,
      role: input.role,
      status: "active",
    },
    select: userSummarySelect,
  });

  try {
    await prisma.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        userId: user.id,
        role: input.role,
        status: "active",
      },
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  }

  await recordUserAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "organization.user.created",
    targetUserId: user.id,
    metadata: { role: input.role, reusedIdentity: false },
  });

  return { ...user, role: input.role };
}

export async function updateUserRole(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  role: OrganizationRole;
}): Promise<UserSummary> {
  const membership = await getActiveMembership(input.organizationId, input.id);
  if (!membership) throw new Error("User not found");

  await assertAdminInvariant({
    organizationId: input.organizationId,
    membership,
    nextRole: input.role,
  });

  await prisma.organizationMember.update({
    where: { id: membership.id },
    data: { role: input.role },
  });

  if (await isLegacyOrganization(input.organizationId)) {
    await prisma.user.update({
      where: { id: input.id },
      data: { role: input.role },
    });
  }

  await recordUserAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "organization.user.role_updated",
    targetUserId: input.id,
    metadata: { fromRole: membership.role, toRole: input.role },
  });

  const user = await getUserById(input.organizationId, input.id);
  if (!user) throw new Error("User not found");
  return user;
}

export async function removeUserFromOrganization(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
}): Promise<void> {
  const membership = await getActiveMembership(input.organizationId, input.id);
  if (!membership) throw new Error("User not found");

  await assertAdminInvariant({
    organizationId: input.organizationId,
    membership,
  });

  await prisma.organizationMember.update({
    where: { id: membership.id },
    data: { status: "inactive" },
  });

  const user = await prisma.user.findUnique({ where: { id: input.id } });
  if (user?.defaultOrganizationId === input.organizationId) {
    const nextMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: input.id,
        status: "active",
        organizationId: { not: input.organizationId },
      },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });

    const removingLegacyWorkspace = await isLegacyOrganization(
      input.organizationId,
    );
    await prisma.user.update({
      where: { id: input.id },
      data: {
        defaultOrganizationId: nextMembership?.organizationId ?? null,
        ...(!nextMembership && removingLegacyWorkspace
          ? { status: "inactive" }
          : {}),
      },
    });
  }

  await recordUserAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "organization.user.removed",
    targetUserId: input.id,
    metadata: { previousRole: membership.role },
  });
}
