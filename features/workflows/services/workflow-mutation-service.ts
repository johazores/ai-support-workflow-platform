import { prisma } from "@/lib/prisma";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";

async function organizationWhere(organizationId: string) {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

type CreateWorkflowRuleInput = {
  organizationId: string;
  name: string;
  description?: string;
  trigger: string;
  actions: Array<{ type: string; value: string }>;
};

export async function createWorkflowRule(input: CreateWorkflowRuleInput) {
  return prisma.workflowRule.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? "",
      trigger: input.trigger,
      actions: input.actions,
    },
  });
}

type UpdateWorkflowStatusInput = {
  organizationId: string;
  workflowId: string;
  isActive: boolean;
};

export async function updateWorkflowStatus(input: UpdateWorkflowStatusInput) {
  const workflow = await prisma.workflowRule.findFirst({
    where: {
      id: input.workflowId,
      ...(await organizationWhere(input.organizationId)),
    },
  });

  if (!workflow) throw new Error("Workflow not found");

  return prisma.workflowRule.update({
    where: { id: workflow.id },
    data: {
      organizationId: input.organizationId,
      isActive: input.isActive,
    },
  });
}

type DeleteWorkflowInput = {
  organizationId: string;
  workflowId: string;
};

export async function deleteWorkflowRule(input: DeleteWorkflowInput) {
  const workflow = await prisma.workflowRule.findFirst({
    where: {
      id: input.workflowId,
      ...(await organizationWhere(input.organizationId)),
    },
  });

  if (!workflow) throw new Error("Workflow not found");
  return prisma.workflowRule.delete({ where: { id: workflow.id } });
}
