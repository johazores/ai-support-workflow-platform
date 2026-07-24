import type { Prisma } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

async function ticketTenantWhere(
  organizationId: string,
): Promise<Prisma.TicketWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function requireTenantTicket(
  organizationId: string,
  ticketId: string,
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...(await ticketTenantWhere(organizationId)) },
    select: { id: true },
  });

  if (!ticket) throw new Error("Ticket not found");
  return ticket;
}

export async function submitCsatRating(
  organizationId: string,
  ticketId: string,
  score: number,
  comment?: string,
) {
  await requireTenantTicket(organizationId, ticketId);

  return prisma.csatRating.upsert({
    where: { ticketId },
    create: {
      organizationId,
      ticketId,
      score,
      comment: comment || null,
    },
    update: {
      organizationId,
      score,
      comment: comment || null,
    },
  });
}

export async function getCsatRating(
  organizationId: string,
  ticketId: string,
) {
  await requireTenantTicket(organizationId, ticketId);

  const rating = await prisma.csatRating.findUnique({ where: { ticketId } });
  if (!rating) return null;

  if (rating.organizationId && rating.organizationId !== organizationId) {
    return null;
  }

  if (!rating.organizationId) {
    return prisma.csatRating.update({
      where: { ticketId },
      data: { organizationId },
    });
  }

  return rating;
}

export async function getCsatStats(organizationId: string) {
  const includeLegacy = await isLegacyOrganization(organizationId);
  const ratings = await prisma.csatRating.findMany({
    where: includeLegacy
      ? { OR: [{ organizationId }, { organizationId: null }] }
      : { organizationId },
  });

  if (ratings.length === 0) {
    return { average: 0, total: 0, distribution: {} };
  }

  const total = ratings.length;
  const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
  const distribution: Record<number, number> = {};

  for (const rating of ratings) {
    distribution[rating.score] = (distribution[rating.score] || 0) + 1;
  }

  return { average: sum / total, total, distribution };
}
