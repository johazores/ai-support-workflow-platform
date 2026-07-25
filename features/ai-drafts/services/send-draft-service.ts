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
      organizationId: input.organizationId,
    },
    include: {
      ticket: {
        include: {
          customer: true,
          messages: {
            where: { externalMessageId: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { externalMessageId: true },
          },
        },
      },
    },
  });

  if (!draft || draft.ticket.organizationId !== input.organizationId) {
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

  const delivery = await sendTicketEmail({
    organizationId: input.organizationId,
    ticketId: draft.ticketId,
    messageId: message.id,
    to: draft.ticket.customer.email,
    subject: `Re: ${draft.ticket.subject}`,
    body: draft.body,
    mailboxId: draft.ticket.mailboxId ?? undefined,
    inReplyTo: draft.ticket.messages[0]?.externalMessageId ?? undefined,
  });

  if (!delivery.success) {
    await prisma.message.delete({ where: { id: message.id } });
    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        ticketId: draft.ticketId,
        type: "reply_failed",
        message: "Saved draft failed to send and remains available for retry.",
      },
    });

    throw new Error(delivery.error || "Failed to send draft");
  }

  await prisma.draft.delete({ where: { id: draft.id } });

  await prisma.ticket.update({
    where: { id: draft.ticketId },
    data: { status: "pending" },
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

  broadcastTicketUpdate(draft.ticketId, "message-created", {
    messageId: message.id,
  });

  return {
    ...message,
    externalMessageId: delivery.externalMessageId,
  };
}
