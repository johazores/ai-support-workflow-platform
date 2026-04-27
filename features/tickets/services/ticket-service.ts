import { prisma } from "@/lib/prisma";
import type { TicketSummary } from "@/features/tickets/types/ticket";
import type { TicketStatus } from "@/features/tickets/types/ticket";
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
    },
  });

  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  return prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status,
    },
  });
}
