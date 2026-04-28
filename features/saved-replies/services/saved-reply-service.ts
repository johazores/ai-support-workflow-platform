import { prisma } from "@/lib/prisma";

export async function getAllSavedReplies() {
  return prisma.savedReply.findMany({
    orderBy: { title: "asc" },
  });
}

type CreateSavedReplyInput = {
  title: string;
  body: string;
  shortcut?: string;
};

export async function createSavedReply(input: CreateSavedReplyInput) {
  return prisma.savedReply.create({
    data: {
      title: input.title,
      body: input.body,
      shortcut: input.shortcut ?? null,
    },
  });
}

type UpdateSavedReplyInput = {
  id: string;
  title: string;
  body: string;
  shortcut?: string;
};

export async function updateSavedReply(input: UpdateSavedReplyInput) {
  return prisma.savedReply.update({
    where: { id: input.id },
    data: {
      title: input.title,
      body: input.body,
      shortcut: input.shortcut ?? null,
    },
  });
}

export async function deleteSavedReply(id: string) {
  return prisma.savedReply.delete({
    where: { id },
  });
}
