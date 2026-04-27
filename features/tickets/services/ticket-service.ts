import { prisma } from "@/lib/prisma";
import type { TicketSummary } from "@/features/tickets/types/ticket";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import type { Prisma } from "@prisma/client";
export async function getTicketSummaries(): Promise<TicketSummary[]> {
  const tickets = await prisma.ticket.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      customer: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status as TicketSummary["status"],
    priority: ticket.priority as TicketSummary["priority"],
    customerName: ticket.customer.name,
    customerEmail: ticket.customer.email,
    preview: ticket.messages[0]?.body ?? "No messages yet.",
    updatedAt: ticket.updatedAt.toISOString(),
  }));
}

export async function getTicketById(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    include: {
      customer: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
      drafts: {
        orderBy: {
          updatedAt: "desc",
        },
      },
      activityLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  const ticket = await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status,
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId,
      type: "status_changed",
      message: `Ticket status changed to ${status}.`,
    },
  });

  return ticket;
}

type AssignTicketInput = {
  ticketId: string;
  assigneeName: string;
  assigneeEmail: string;
};

export async function assignTicket(input: AssignTicketInput) {
  const ticket = await prisma.ticket.update({
    where: {
      id: input.ticketId,
    },
    data: {
      assigneeName: input.assigneeName,
      assigneeEmail: input.assigneeEmail,
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId: input.ticketId,
      type: "ticket_assigned",
      message: `Ticket assigned to ${input.assigneeName}.`,
    },
  });

  return ticket;
}

type GetTicketsInput = {
  search?: string;
  status?: TicketStatus;
};

export async function getTickets(
  input?: GetTicketsInput,
): Promise<TicketSummary[]> {
  const where: Prisma.TicketWhereInput = {};

  if (input?.status) {
    where.status = input.status;
  }

  if (input?.search) {
    where.OR = [
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
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      customer: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketSummary["priority"],
    customerName: ticket.customer.name,
    customerEmail: ticket.customer.email,
    preview: ticket.messages[0]?.body ?? "",
    updatedAt: ticket.updatedAt.toISOString(),
  }));
}
