import { prisma } from "@/lib/prisma";

type SaveDraftInput = {
  ticketId: string;
  body: string;
};

export async function saveDraft(input: SaveDraftInput) {
  return prisma.draft.create({
    data: {
      ticketId: input.ticketId,
      body: input.body,
    },
  });
}
