import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganization } from "@/features/organizations/services/organization-service";

function tenantFilter(organizationId: string) {
  return {
    OR: [{ organizationId }, { organizationId: null }],
  };
}

export async function getAllTags(organizationId: string) {
  return prisma.tag.findMany({
    where: tenantFilter(organizationId),
    orderBy: { name: "asc" },
  });
}

type CreateTagInput = {
  organizationId: string;
  name: string;
  color?: string;
};

export async function createTag(input: CreateTagInput) {
  const existing = await prisma.tag.findFirst({
    where: {
      organizationId: input.organizationId,
      name: input.name,
    },
  });
  if (existing) throw new Error("Tag name already exists");

  return prisma.tag.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      color: input.color ?? "slate",
    },
  });
}

export async function setTicketTags(
  organizationId: string,
  ticketId: string,
  tagIds: string[],
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...tenantFilter(organizationId) },
  });
  if (!ticket) throw new Error("Ticket not found");

  const tags = await prisma.tag.findMany({
    where: {
      id: { in: tagIds },
      ...tenantFilter(organizationId),
    },
    select: { id: true },
  });
  if (tags.length !== new Set(tagIds).size) {
    throw new Error("One or more tags are unavailable");
  }

  return prisma.ticket.update({
    where: { id: ticket.id },
    data: { organizationId, tagIds },
  });
}

export async function getTagsForTicket(
  organizationId: string,
  ticketId: string,
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...tenantFilter(organizationId) },
    select: { tagIds: true },
  });

  if (!ticket || ticket.tagIds.length === 0) return [];

  return prisma.tag.findMany({
    where: {
      id: { in: ticket.tagIds },
      ...tenantFilter(organizationId),
    },
    orderBy: { name: "asc" },
  });
}

export async function addTagToTicket(
  ticketId: string,
  tagId: string,
  requestedOrganizationId?: string,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, tagIds: true, organizationId: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  if (
    requestedOrganizationId &&
    ticket.organizationId &&
    ticket.organizationId !== requestedOrganizationId
  ) {
    throw new Error("Ticket not found");
  }

  const defaultOrganization = await ensureDefaultOrganization();
  const organizationId =
    requestedOrganizationId || ticket.organizationId || defaultOrganization.id;

  const tag = await prisma.tag.findFirst({
    where: { id: tagId, ...tenantFilter(organizationId) },
    select: { id: true },
  });

  if (!tag) throw new Error("Tag not found");
  if (ticket.tagIds.includes(tagId)) return;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      organizationId,
      tagIds: { push: tagId },
    },
  });
}
