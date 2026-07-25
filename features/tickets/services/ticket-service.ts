import type { Prisma } from "@prisma/client";
import {
  isLegacyOrganization,
  requireOrganizationMembership,
} from "@/features/organizations/services/organization-service";
import type {
  TicketStatus,
  TicketSummary,
} from "@/features/tickets/types/ticket";
import { dispatchTicketUpdatedWorkflows } from "@/features/workflows/services/workflow-event-service";
import { prisma } from "@/lib/prisma";
import { broadcastTicketUpdate } from "@/pages/api/tickets/[ticket-id]/events";

async function tenantTicketFilter(
  organizationId: string,
): Promise<Prisma.TicketWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function findTenantTicket(ticketId: string, organizationId: string) {
  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(await tenantTicketFilter(organizationId)),
    },
  });
}

async function recordTicketMutation(input: {
  organizationId: string;
  ticketId: string;
  type: string;
  message: string;
}) {
  return prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      type: input.type,
      message: input.message,
    },
  });
}

async function dispatchMutationWorkflows(input: {
  organizationId: string;
  ticketId: string;
  activityId: string;
}) {
  await dispatchTicketUpdatedWorkflows({
    organizationId: input.organizationId,
    ticketId: input.ticketId,
    eventId: input.activityId,
  });
}

export async function getTicketSummaries(
  organizationId: string,
): Promise<TicketSummary[]> {
  const tickets = await prisma.ticket.findMany({
    where: await tenantTicketFilter(organizationId),
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return tickets.map((ticket) => mapTicketSummary(ticket));
}

export async function getTicketById(
  ticketId: string,
  organizationId: string,
) {
  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(await tenantTicketFilter(organizationId)),
    },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "asc" } },
      drafts: { orderBy: { updatedAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  organizationId: string,
) {
  const existing = await findTenantTicket(ticketId, organizationId);
  if (!existing) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: { organizationId, status },
  });

  const activity = await recordTicketMutation({
    organizationId,
    ticketId,
    type: "status_changed",
    message: `Ticket status changed to ${status}.`,
  });

  await dispatchMutationWorkflows({
    organizationId,
    ticketId,
    activityId: activity.id,
  });
  broadcastTicketUpdate(ticketId, "status-changed", { status });

  return ticket;
}

export async function updateTicketPriority(
  ticketId: string,
  priority: "low" | "normal" | "high" | "urgent",
  organizationId: string,
) {
  const existing = await findTenantTicket(ticketId, organizationId);
  if (!existing) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: { organizationId, priority },
  });

  const activity = await recordTicketMutation({
    organizationId,
    ticketId,
    type: "priority_changed",
    message: `Priority changed to ${priority}.`,
  });

  await dispatchMutationWorkflows({
    organizationId,
    ticketId,
    activityId: activity.id,
  });
  broadcastTicketUpdate(ticketId, "priority-changed", { priority });

  return ticket;
}

type AssignTicketInput = {
  organizationId: string;
  ticketId: string;
  assigneeName: string;
  assigneeEmail: string;
};

export async function assignTicket(input: AssignTicketInput) {
  const existing = await findTenantTicket(input.ticketId, input.organizationId);
  if (!existing) throw new Error("Ticket not found");

  const assignee = await prisma.user.findUnique({
    where: { email: input.assigneeEmail.toLowerCase().trim() },
  });
  if (!assignee || assignee.status !== "active") {
    throw new Error("Assignee not found");
  }

  const membership = await requireOrganizationMembership(
    assignee.id,
    input.organizationId,
  );
  if (!membership) {
    throw new Error("Assignee is not a member of this organization");
  }

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: {
      organizationId: input.organizationId,
      assigneeName: assignee.name,
      assigneeEmail: assignee.email,
    },
  });

  const activity = await recordTicketMutation({
    organizationId: input.organizationId,
    ticketId: input.ticketId,
    type: "ticket_assigned",
    message: `Ticket assigned to ${assignee.name}.`,
  });

  await dispatchMutationWorkflows({
    organizationId: input.organizationId,
    ticketId: input.ticketId,
    activityId: activity.id,
  });

  broadcastTicketUpdate(input.ticketId, "ticket-assigned", {
    assigneeName: assignee.name,
  });

  return ticket;
}

type GetTicketsInput = {
  organizationId: string;
  search?: string;
  status?: TicketStatus;
  priority?: string;
  cursor?: string;
  limit?: number;
};

type PaginatedTickets = {
  tickets: TicketSummary[];
  nextCursor: string | null;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export async function getTickets(
  input: GetTicketsInput,
): Promise<PaginatedTickets> {
  const filters: Prisma.TicketWhereInput[] = [
    await tenantTicketFilter(input.organizationId),
  ];
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );

  if (input.status) filters.push({ status: input.status });
  if (input.priority) filters.push({ priority: input.priority });

  if (input.search) {
    filters.push({
      OR: [
        {
          subject: {
            contains: input.search,
            mode: "insensitive",
          },
        },
        {
          customer: {
            is: {
              name: {
                contains: input.search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          customer: {
            is: {
              email: {
                contains: input.search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          messages: {
            some: {
              body: {
                contains: input.search,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  const tickets = await prisma.ticket.findMany({
    where: { AND: filters },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(input.cursor
      ? {
          skip: 1,
          cursor: { id: input.cursor },
        }
      : {}),
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const hasMore = tickets.length > limit;
  const page = hasMore ? tickets.slice(0, limit) : tickets;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return {
    tickets: page.map((ticket) => mapTicketSummary(ticket)),
    nextCursor,
  };
}

type TicketWithSummaryRelations = Prisma.TicketGetPayload<{
  include: {
    customer: true;
    messages: true;
  };
}>;

function mapTicketSummary(ticket: TicketWithSummaryRelations): TicketSummary {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketSummary["priority"],
    customerName: ticket.customer.name,
    customerEmail: ticket.customer.email,
    preview: ticket.messages[0]?.body ?? "No messages yet.",
    tagIds: ticket.tagIds,
    updatedAt: ticket.updatedAt.toISOString(),
  };
}
