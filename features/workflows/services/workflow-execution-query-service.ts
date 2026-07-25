import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

export async function listWorkflowExecutions(
  organizationId: string,
  options?: { limit?: number },
) {
  const executions = await prisma.workflowExecution.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: Math.min(options?.limit ?? 50, 100),
  });

  const workflowIds = [
    ...new Set(executions.map((execution) => execution.workflowId)),
  ];
  if (workflowIds.length === 0) return [];

  const includeLegacy = await isLegacyOrganization(organizationId);
  const [workflows, legacyRules] = await Promise.all([
    prisma.workflow.findMany({
      where: { organizationId, id: { in: workflowIds } },
      select: { id: true, name: true },
    }),
    prisma.workflowRule.findMany({
      where: {
        id: { in: workflowIds },
        ...(includeLegacy
          ? { OR: [{ organizationId }, { organizationId: null }] }
          : { organizationId }),
      },
      select: { id: true, name: true },
    }),
  ]);

  const names = new Map<string, string>();
  for (const rule of legacyRules) names.set(rule.id, rule.name);
  for (const workflow of workflows) names.set(workflow.id, workflow.name);

  return executions.map((execution) => ({
    ...execution,
    workflowName: names.get(execution.workflowId) || "Workflow",
  }));
}

export async function getWorkflowExecution(
  organizationId: string,
  executionId: string,
) {
  const execution = await prisma.workflowExecution.findFirst({
    where: { id: executionId, organizationId },
  });
  if (!execution) return null;

  const includeLegacy = await isLegacyOrganization(organizationId);
  const [steps, workflow, rule] = await Promise.all([
    prisma.workflowExecutionStep.findMany({
      where: { executionId, organizationId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workflow.findFirst({
      where: {
        id: execution.workflowId,
        organizationId,
      },
      select: { name: true },
    }),
    prisma.workflowRule.findFirst({
      where: {
        id: execution.workflowId,
        ...(includeLegacy
          ? { OR: [{ organizationId }, { organizationId: null }] }
          : { organizationId }),
      },
      select: { name: true },
    }),
  ]);

  return {
    ...execution,
    workflowName: workflow?.name || rule?.name || "Workflow",
    steps,
  };
}
