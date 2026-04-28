import { prisma } from "@/lib/prisma";

export async function submitCsatRating(
  ticketId: string,
  score: number,
  comment?: string,
) {
  return prisma.csatRating.upsert({
    where: { ticketId },
    create: { ticketId, score, comment: comment || null },
    update: { score, comment: comment || null },
  });
}

export async function getCsatRating(ticketId: string) {
  return prisma.csatRating.findUnique({ where: { ticketId } });
}

export async function getCsatStats() {
  const ratings = await prisma.csatRating.findMany();
  if (ratings.length === 0) return { average: 0, total: 0, distribution: {} };

  const total = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  const distribution: Record<number, number> = {};
  for (const r of ratings) {
    distribution[r.score] = (distribution[r.score] || 0) + 1;
  }

  return { average: sum / total, total, distribution };
}
