import { prisma } from "@/lib/prisma";

export async function getWorkflowRules(organizationId: string) {
  return prisma.workflowRule.findMany({
    where: {
      OR: [{ organizationId }, { organizationId: null }],
    },
    orderBy: { createdAt: "desc" },
  });
}
