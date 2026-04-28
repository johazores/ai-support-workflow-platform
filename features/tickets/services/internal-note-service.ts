import { prisma } from "@/lib/prisma";

type AddInternalNoteInput = {
  ticketId: string;
  body: string;
};

export async function addInternalNote(input: AddInternalNoteInput) {
  const message = await prisma.message.create({
    data: {
      ticketId: input.ticketId,
      author: "note",
      body: input.body,
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId: input.ticketId,
      type: "internal_note_added",
      message: "Internal note added.",
    },
  });

  return message;
}
