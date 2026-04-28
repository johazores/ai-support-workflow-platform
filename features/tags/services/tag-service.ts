import { prisma } from "@/lib/prisma";

export async function getAllTags() {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
}

type CreateTagInput = {
  name: string;
  color?: string;
};

export async function createTag(input: CreateTagInput) {
  return prisma.tag.create({
    data: {
      name: input.name,
      color: input.color ?? "slate",
    },
  });
}

export async function setTicketTags(ticketId: string, tagIds: string[]) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { tagIds },
  });
}

export async function getTagsForTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { tagIds: true },
  });

  if (!ticket || ticket.tagIds.length === 0) return [];

  return prisma.tag.findMany({
    where: { id: { in: ticket.tagIds } },
    orderBy: { name: "asc" },
  });
}

export async function addTagToTicket(ticketId: string, tagId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { tagIds: true },
  });

  if (!ticket) throw new Error("Ticket not found");

  if (ticket.tagIds.includes(tagId)) return;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { tagIds: { push: tagId } },
  });
}
