import { prisma } from "@/lib/prisma";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";

export async function getWorkflowRules(organizationId: string) {
  const includeLegacy = await isLegacyOrganization(organizationId);

  return prisma.workflowRule.findMany({
    where: includeLegacy
      ? { OR: [{ organizationId }, { organizationId: null }] }
      : { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
