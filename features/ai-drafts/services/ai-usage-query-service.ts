import { prisma } from "@/lib/prisma";

export async function getAiUsageLogs() {
  return prisma.aiUsageLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}
