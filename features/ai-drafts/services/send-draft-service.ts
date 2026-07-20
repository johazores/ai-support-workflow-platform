import { prisma } from "@/lib/prisma";
import { sendTicketEmail } from "@/features/tickets/services/email-send-service";
import { broadcastTicketUpdate } from "@/pages/api/tickets/[ticket-id]/events";

type SendDraftInput = {
  organizationId: string;
  draftId: string;
};

export async function sendDraft(input: SendDraftInput) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      OR: [
        { organizationId: input.organizationId },
        { organizationId: null },
      ],
    },
    include: {
      ticket: {
        include: { customer: true },
      },
    },
  });

  if (!draft || (draft.ticket.organizationId && draft.ticket.organizationId !== input.organizationId)) {
    throw new Error("Draft not found");
  }

  const message = await prisma.message.create({
    data: {
      organizationId: input.organizationId,
      ticketId: draft.ticketId,
      author: "support",
      body: draft.body,
    },
  });

  await prisma.draft.delete({ where: { id: draft.id } });

  await prisma.ticket.update({
    where: { id: draft.ticketId },
    data: {
      organizationId: input.organizationId,
      status: "pending",
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        organizationId: input.organizationId,
        ticketId: draft.ticketId,
        type: "reply_sent",
        message: "Support reply sent from saved draft.",
      },
      {
        organizationId: input.organizationId,
        ticketId: draft.ticketId,
        type: "status_changed",
        message: "Ticket status changed to pending after reply was sent.",
      },
    ],
  });

  await sendTicketEmail({
    ticketId: draft.ticketId,
    messageId: message.id,
    to: draft.ticket.customer.email,
    subject: `Re: ${draft.ticket.subject}`,
    body: draft.body,
  });

  broadcastTicketUpdate(draft.ticketId, "message-created", {
    messageId: message.id,
  });

  return message;
}
