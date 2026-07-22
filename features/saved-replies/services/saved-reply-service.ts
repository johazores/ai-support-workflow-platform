import { prisma } from "@/lib/prisma";

function tenantFilter(organizationId: string) {
  return { OR: [{ organizationId }, { organizationId: null }] };
}

export async function getAllSavedReplies(organizationId: string) {
  return prisma.savedReply.findMany({
    where: tenantFilter(organizationId),
    orderBy: { title: "asc" },
  });
}

type CreateSavedReplyInput = {
  organizationId: string;
  title: string;
  body: string;
  shortcut?: string;
};

export async function createSavedReply(input: CreateSavedReplyInput) {
  return prisma.savedReply.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      body: input.body,
      shortcut: input.shortcut ?? null,
    },
  });
}

type UpdateSavedReplyInput = {
  organizationId: string;
  id: string;
  title: string;
  body: string;
  shortcut?: string;
};

export async function updateSavedReply(input: UpdateSavedReplyInput) {
  const existing = await prisma.savedReply.findFirst({
    where: { id: input.id, ...tenantFilter(input.organizationId) },
  });
  if (!existing) throw new Error("Saved reply not found");

  return prisma.savedReply.update({
    where: { id: existing.id },
    data: {
      organizationId: input.organizationId,
      title: input.title,
      body: input.body,
      shortcut: input.shortcut ?? null,
    },
  });
}

export async function deleteSavedReply(
  organizationId: string,
  id: string,
) {
  const existing = await prisma.savedReply.findFirst({
    where: { id, ...tenantFilter(organizationId) },
  });
  if (!existing) throw new Error("Saved reply not found");

  return prisma.savedReply.delete({ where: { id: existing.id } });
}
