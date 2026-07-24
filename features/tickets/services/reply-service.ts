import { prisma } from "@/lib/prisma";
import { sendTicketEmail } from "@/features/tickets/services/email-send-service";
import { broadcastTicketUpdate } from "@/pages/api/tickets/[ticket-id]/events";

type SendManualReplyInput = {
  organizationId: string;
  ticketId: string;
  body: string;
};

export async function sendManualReply(input: SendManualReplyInput) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: input.ticketId,
      organizationId: input.organizationId,
    },
    include: {
      customer: true,
      messages: {
        where: { externalMessageId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { externalMessageId: true },
      },
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  const message = await prisma.message.create({
    data: {
      organizationId: input.organizationId,
      ticketId: ticket.id,
      author: "support",
      body: input.body,
    },
  });

  const delivery = await sendTicketEmail({
    organizationId: input.organizationId,
    ticketId: ticket.id,
    messageId: message.id,
    to: ticket.customer.email,
    subject: `Re: ${ticket.subject}`,
    body: input.body,
    mailboxId: ticket.mailboxId ?? undefined,
    inReplyTo: ticket.messages[0]?.externalMessageId ?? undefined,
  });

  if (!delivery.success) {
    await prisma.message.delete({ where: { id: message.id } });
    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        ticketId: ticket.id,
        type: "reply_failed",
        message: "Manual support reply failed to send.",
      },
    });

    throw new Error(delivery.error || "Failed to send support reply");
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "pending" },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      ticketId: ticket.id,
      type: "reply_sent",
      message: "Manual support reply sent.",
    },
  });

  broadcastTicketUpdate(ticket.id, "message-created", {
    messageId: message.id,
  });

  return {
    ...message,
    externalMessageId: delivery.externalMessageId,
  };
}
