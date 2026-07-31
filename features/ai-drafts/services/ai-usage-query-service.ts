import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

export async function getAiUsageLogs(
  organizationId: string,
  options?: { limit?: number },
) {
  const includeLegacy = await isLegacyOrganization(organizationId);

  return prisma.aiUsageLog.findMany({
    where: includeLegacy
      ? { OR: [{ organizationId }, { organizationId: null }] }
      : { organizationId },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(options?.limit ?? 50, 100),
  });
}
