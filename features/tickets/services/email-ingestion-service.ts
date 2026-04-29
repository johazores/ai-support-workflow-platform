import { prisma } from "@/lib/prisma";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-service";
import {
  notifyAssignee,
  notifyAdmins,
} from "@/features/notifications/services/notification-service";
import { classifyTicket } from "@/features/ai-drafts/services/classification-service";

type InboundEmailInput = {
  from: string;
  fromName: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string;
  mailboxId?: string;
};

export async function processInboundEmail(input: InboundEmailInput) {
  // Find or create customer by email
  let customer = await prisma.customer.findUnique({
    where: { email: input.from },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: input.fromName || input.from,
        email: input.from,
      },
    });
  }

  // Try to find existing thread via inReplyTo
  let ticketId: string | null = null;

  if (input.inReplyTo) {
    const parentMessage = await prisma.message.findFirst({
      where: { externalMessageId: input.inReplyTo },
      select: { ticketId: true },
    });

    if (parentMessage) {
      ticketId = parentMessage.ticketId;
    }
  }

  // If no thread found, create a new ticket
  if (!ticketId) {
    const ticket = await prisma.ticket.create({
      data: {
        subject: input.subject,
        status: "open",
        priority: "normal",
        customerId: customer.id,
        mailboxId: input.mailboxId ?? null,
      },
    });

    ticketId = ticket.id;

    // Auto-classify new tickets by priority
    await classifyTicket(ticketId, input.subject, input.body);
  }

  // Create the message
  const message = await prisma.message.create({
    data: {
      ticketId,
      author: "customer",
      body: input.body,
      externalMessageId: input.messageId,
      inReplyTo: input.inReplyTo ?? null,
    },
  });

  // Re-open ticket if it was resolved/closed
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true },
  });

  if (ticket && (ticket.status === "resolved" || ticket.status === "closed")) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "open" },
    });

    await prisma.activityLog.create({
      data: {
        ticketId,
        type: "status_changed",
        message: "Ticket re-opened by new customer email.",
      },
    });
  }

  await executeWorkflowRules(ticketId);

  // Notify relevant users
  if (input.inReplyTo) {
    await notifyAssignee(ticketId, {
      type: "customer-reply",
      title: "New customer reply",
      message: `${input.fromName} replied to a ticket.`,
    });
  } else {
    await notifyAdmins({
      type: "new-ticket",
      title: "New ticket from email",
      message: `${input.fromName}: ${input.subject}`,
      ticketId,
    });
  }

  return { ticketId, messageId: message.id, isNewTicket: !input.inReplyTo };
}
