import { prisma } from "@/lib/prisma";
import { sendTicketEmail } from "@/features/tickets/services/email-send-service";
import { broadcastTicketUpdate } from "@/pages/api/tickets/[ticket-id]/events";

type SendManualReplyInput = {
  ticketId: string;
  body: string;
};

export async function sendManualReply(input: SendManualReplyInput) {
  const message = await prisma.message.create({
    data: {
      ticketId: input.ticketId,
      author: "support",
      body: input.body,
    },
  });

  await prisma.ticket.update({
    where: {
      id: input.ticketId,
    },
    data: {
      status: "pending",
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId: input.ticketId,
      type: "reply_sent",
      message: "Manual support reply sent.",
    },
  });

  broadcastTicketUpdate(input.ticketId, "message-created", {
    messageId: message.id,
  });

  // Dispatch email to customer
  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    include: { customer: true },
  });

  if (ticket) {
    await sendTicketEmail({
      ticketId: input.ticketId,
      messageId: message.id,
      to: ticket.customer.email,
      subject: `Re: ${ticket.subject}`,
      body: input.body,
    });
  }

  return message;
}
