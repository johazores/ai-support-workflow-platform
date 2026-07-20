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
  const legacyRules = await prisma.workflowRule.findMany({
    where: { id: { in: workflowIds } },
  });
  const names = new Map(legacyRules.map((rule) => [rule.id, rule.name]));

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

  const [steps, rule] = await Promise.all([
    prisma.workflowExecutionStep.findMany({
      where: { executionId, organizationId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workflowRule.findUnique({ where: { id: execution.workflowId } }),
  ]);

  return {
    ...execution,
    workflowName: rule?.name || "Workflow",
    steps,
  };
}
