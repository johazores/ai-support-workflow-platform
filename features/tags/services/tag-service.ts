import {
  ensureDefaultOrganization,
  isLegacyOrganization,
} from "@/features/organizations/services/organization-service";
import { dispatchTicketUpdatedWorkflows } from "@/features/workflows/services/workflow-event-service";
import { prisma } from "@/lib/prisma";

async function tenantFilter(organizationId: string) {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

function sameTagSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((tagId) => rightSet.has(tagId));
}

export async function getAllTags(organizationId: string) {
  return prisma.tag.findMany({
    where: await tenantFilter(organizationId),
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
  const organizationFilter = await tenantFilter(organizationId);
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...organizationFilter },
  });
  if (!ticket) throw new Error("Ticket not found");

  const uniqueTagIds = [...new Set(tagIds)];
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: uniqueTagIds },
      ...organizationFilter,
    },
    select: { id: true },
  });
  if (tags.length !== uniqueTagIds.length) {
    throw new Error("One or more tags are unavailable");
  }

  if (sameTagSet(ticket.tagIds, uniqueTagIds)) return ticket;

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { organizationId, tagIds: uniqueTagIds },
  });
  const activity = await prisma.activityLog.create({
    data: {
      organizationId,
      ticketId,
      type: "tags_changed",
      message: "Ticket tags were updated.",
    },
  });

  await dispatchTicketUpdatedWorkflows({
    organizationId,
    ticketId,
    eventId: activity.id,
  });

  return updated;
}

export async function getTagsForTicket(
  organizationId: string,
  ticketId: string,
) {
  const organizationFilter = await tenantFilter(organizationId);
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...organizationFilter },
    select: { tagIds: true },
  });

  if (!ticket || ticket.tagIds.length === 0) return [];

  return prisma.tag.findMany({
    where: {
      id: { in: ticket.tagIds },
      ...organizationFilter,
    },
    orderBy: { name: "asc" },
  });
}

export async function addTagToTicket(
  ticketId: string,
  tagId: string,
  requestedOrganizationId?: string,
) {
  const requestedFilter = requestedOrganizationId
    ? await tenantFilter(requestedOrganizationId)
    : undefined;
  const ticket = await prisma.ticket.findFirst({
    where: requestedFilter
      ? { id: ticketId, ...requestedFilter }
      : { id: ticketId },
    select: { id: true, tagIds: true, organizationId: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  const defaultOrganization = ticket.organizationId
    ? null
    : await ensureDefaultOrganization();
  const organizationId =
    requestedOrganizationId || ticket.organizationId || defaultOrganization?.id;

  if (!organizationId) throw new Error("Organization not found");

  const tag = await prisma.tag.findFirst({
    where: { id: tagId, ...(await tenantFilter(organizationId)) },
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
