import { prisma } from "@/lib/prisma";

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
