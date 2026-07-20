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
      OR: [
        { organizationId: input.organizationId },
        { organizationId: null },
      ],
    },
    include: { customer: true },
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

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      organizationId: input.organizationId,
      status: "pending",
    },
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

  await sendTicketEmail({
    ticketId: ticket.id,
    messageId: message.id,
    to: ticket.customer.email,
    subject: `Re: ${ticket.subject}`,
    body: input.body,
  });

  return message;
}
