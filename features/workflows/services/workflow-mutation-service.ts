import { prisma } from "@/lib/prisma";

type CreateWorkflowRuleInput = {
  name: string;
  description?: string;
  trigger: string;
  actions: Array<{ type: string; value: string }>;
};

export async function createWorkflowRule(input: CreateWorkflowRuleInput) {
  return prisma.workflowRule.create({
    data: {
      name: input.name,
      description: input.description ?? "",
      trigger: input.trigger,
      actions: input.actions,
    },
  });
}

type UpdateWorkflowStatusInput = {
  workflowId: string;
  isActive: boolean;
};

export async function updateWorkflowStatus(input: UpdateWorkflowStatusInput) {
  return prisma.workflowRule.update({
    where: {
      id: input.workflowId,
    },
    data: {
      isActive: input.isActive,
    },
  });
}

type DeleteWorkflowInput = {
  workflowId: string;
};

export async function deleteWorkflowRule(input: DeleteWorkflowInput) {
  return prisma.workflowRule.delete({
    where: {
      id: input.workflowId,
    },
  });
}
