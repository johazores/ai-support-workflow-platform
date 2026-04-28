import { prisma } from "@/lib/prisma";

type SendDraftInput = {
  draftId: string;
};

export async function sendDraft(input: SendDraftInput) {
  const draft = await prisma.draft.findUnique({
    where: {
      id: input.draftId,
    },
  });

  if (!draft) {
    throw new Error("Draft not found");
  }

  const message = await prisma.message.create({
    data: {
      ticketId: draft.ticketId,
      author: "support",
      body: draft.body,
    },
  });

  await prisma.draft.delete({
    where: {
      id: draft.id,
    },
  });

  await prisma.ticket.update({
    where: {
      id: draft.ticketId,
    },
    data: {
      status: "pending",
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId: draft.ticketId,
      type: "reply_sent",
      message: "Support reply sent from saved draft.",
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId: draft.ticketId,
      type: "status_changed",
      message: "Ticket status changed to pending after reply was sent.",
    },
  });

  return message;
}
