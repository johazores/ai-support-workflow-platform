import type { Prisma } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

async function tenantFilter(
  organizationId: string,
): Promise<Prisma.SavedReplyWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

export async function getAllSavedReplies(organizationId: string) {
  return prisma.savedReply.findMany({
    where: await tenantFilter(organizationId),
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
    where: { id: input.id, ...(await tenantFilter(input.organizationId)) },
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
    where: { id, ...(await tenantFilter(organizationId)) },
  });
  if (!existing) throw new Error("Saved reply not found");

  return prisma.savedReply.delete({ where: { id: existing.id } });
}
