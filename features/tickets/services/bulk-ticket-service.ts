import type { Prisma } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import type {
  TicketPriority,
  TicketStatus,
} from "@/features/tickets/types/ticket";
import { prisma } from "@/lib/prisma";

type BulkTicketAction =
  | { type: "change-status"; value: TicketStatus }
  | { type: "change-priority"; value: TicketPriority }
  | { type: "assign"; value: string };

async function tenantWhere(
  organizationId: string,
): Promise<Prisma.TicketWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function resolveAssignment(organizationId: string, value: string) {
  const user = await prisma.user.findFirst({
    where: {
      status: "active",
      OR: [{ email: value }, { name: value }],
    },
    select: { id: true, name: true, email: true },
  });

  if (!user) throw new Error("Assignee not found");

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { status: true },
  });

  if (membership?.status !== "active") {
    throw new Error("Assignee is not an active organization member");
  }

  return user;
}

export async function bulkUpdateTickets(input: {
  organizationId: string;
  ticketIds: string[];
  action: BulkTicketAction;
}) {
  const ticketIds = [...new Set(input.ticketIds)];
  const organizationFilter = await tenantWhere(input.organizationId);
  const tickets = await prisma.ticket.findMany({
    where: {
      id: { in: ticketIds },
      ...organizationFilter,
    },
    select: { id: true },
  });

  if (tickets.length !== ticketIds.length) {
    throw new Error("One or more tickets not found");
  }

  let updateData: Prisma.TicketUpdateManyMutationInput;
  let activityType: string;
  let activityMessage: string;

  if (input.action.type === "change-status") {
    updateData = {
      organizationId: input.organizationId,
      status: input.action.value,
    };
    activityType = "bulk_change_status";
    activityMessage = `Bulk status changed to ${input.action.value}`;
  } else if (input.action.type === "change-priority") {
    updateData = {
      organizationId: input.organizationId,
      priority: input.action.value,
    };
    activityType = "bulk_change_priority";
    activityMessage = `Bulk priority changed to ${input.action.value}`;
  } else {
    const assignee = await resolveAssignment(
      input.organizationId,
      input.action.value,
    );
    updateData = {
      organizationId: input.organizationId,
      assigneeName: assignee.name,
      assigneeEmail: assignee.email,
    };
    activityType = "bulk_assign";
    activityMessage = `Bulk assigned to ${assignee.name}`;
  }

  const updated = await prisma.ticket.updateMany({
    where: {
      id: { in: ticketIds },
      ...organizationFilter,
    },
    data: updateData,
  });

  if (updated.count !== ticketIds.length) {
    throw new Error("Bulk ticket update was incomplete");
  }

  await prisma.activityLog.createMany({
    data: ticketIds.map((ticketId) => ({
      organizationId: input.organizationId,
      ticketId,
      type: activityType,
      message: activityMessage,
    })),
  });

  return { updated: updated.count };
}
