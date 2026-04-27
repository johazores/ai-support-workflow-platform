import { prisma } from "@/lib/prisma";

type WorkflowAction = {
  type: "change-status" | "assign-ticket";
  value: string;
};

type WorkflowRuleActions = WorkflowAction[];

export async function executeWorkflowRules(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
  });

  if (!ticket) {
    return {
      executed: false,
      message: "Ticket not found.",
    };
  }

  const rules = await prisma.workflowRule.findMany({
    where: {
      isActive: true,
    },
  });

  const executedRules: string[] = [];

  for (const rule of rules) {
    const shouldExecute =
      rule.trigger === "ticket.priority is high" && ticket.priority === "high";

    if (!shouldExecute) continue;

    const actions = rule.actions as WorkflowRuleActions;

    for (const action of actions) {
      if (action.type === "change-status") {
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },
          data: {
            status: action.value,
          },
        });
      }

      if (action.type === "assign-ticket") {
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },
          data: {
            assigneeName: action.value,
            assigneeEmail: "technical@example.com",
          },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        ticketId,
        type: "workflow_executed",
        message: `Workflow executed: ${rule.name}.`,
      },
    });

    executedRules.push(rule.name);
  }

  return {
    executed: executedRules.length > 0,
    rules: executedRules,
  };
}
