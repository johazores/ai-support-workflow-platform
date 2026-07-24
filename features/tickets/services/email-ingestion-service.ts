import { prisma } from "@/lib/prisma";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-service";
import {
  notifyAssignee,
  notifyAdmins,
} from "@/features/notifications/services/notification-service";
import { classifyTicket } from "@/features/ai-drafts/services/classification-service";

type InboundEmailInput = {
  organizationId: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string;
  mailboxId?: string;
};

export async function processInboundEmail(input: InboundEmailInput) {
  const existingMessage = await prisma.message.findFirst({
    where: {
      organizationId: input.organizationId,
      externalMessageId: input.messageId,
    },
    select: { id: true, ticketId: true },
  });

  if (existingMessage) {
    return {
      ticketId: existingMessage.ticketId,
      messageId: existingMessage.id,
      isNewTicket: false,
      isDuplicate: true,
    };
  }

  let customer = await prisma.customer.findFirst({
    where: {
      organizationId: input.organizationId,
      email: input.from,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        organizationId: input.organizationId,
        name: input.fromName || input.from,
        email: input.from,
      },
    });
  }

  let ticketId: string | null = null;
  let isNewTicket = false;

  if (input.inReplyTo) {
    const parentMessage = await prisma.message.findFirst({
      where: {
        organizationId: input.organizationId,
        externalMessageId: input.inReplyTo,
      },
      select: { ticketId: true },
    });

    if (parentMessage) {
      ticketId = parentMessage.ticketId;
    }
  }

  if (!ticketId) {
    const ticket = await prisma.ticket.create({
      data: {
        organizationId: input.organizationId,
        subject: input.subject,
        status: "open",
        priority: "normal",
        customerId: customer.id,
        mailboxId: input.mailboxId ?? null,
      },
    });

    ticketId = ticket.id;
    isNewTicket = true;

    await classifyTicket(
      ticketId,
      input.subject,
      input.body,
      input.organizationId,
    );
  }

  const message = await prisma.message.create({
    data: {
      organizationId: input.organizationId,
      ticketId,
      author: "customer",
      body: input.body,
      externalMessageId: input.messageId,
      inReplyTo: input.inReplyTo ?? null,
    },
  });

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: input.organizationId },
    select: { status: true },
  });

  if (ticket && (ticket.status === "resolved" || ticket.status === "closed")) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "open" },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        ticketId,
        type: "status_changed",
        message: "Ticket re-opened by new customer email.",
      },
    });
  }

  await executeWorkflowRules(ticketId, {
    organizationId: input.organizationId,
    triggerType: "inbound-email",
  });

  if (isNewTicket) {
    await notifyAdmins(input.organizationId, {
      type: "new-ticket",
      title: "New ticket from email",
      message: `${input.fromName}: ${input.subject}`,
      ticketId,
    });
  } else {
    await notifyAssignee(input.organizationId, ticketId, {
      type: "customer-reply",
      title: "New customer reply",
      message: `${input.fromName} replied to a ticket.`,
    });
  }

  return {
    ticketId,
    messageId: message.id,
    isNewTicket,
    isDuplicate: false,
  };
}
