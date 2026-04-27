import { prisma } from "@/lib/prisma";

export async function getWorkflowRules() {
  return prisma.workflowRule.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}
