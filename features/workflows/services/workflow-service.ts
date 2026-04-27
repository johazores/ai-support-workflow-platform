import { prisma } from "@/lib/prisma";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";

type WorkflowAction = {
  type: "change-status" | "assign-ticket" | "generate-draft";
  value: string;
};

type WorkflowRuleActions = WorkflowAction[];

function shouldExecuteWorkflow(
  trigger: string,
  ticket: { subject: string; priority: string },
) {
  if (trigger === "ticket.priority is high") {
    return ticket.priority === "high";
  }

  if (trigger === "ticket.subject contains account") {
    return ticket.subject.toLowerCase().includes("account");
  }

  return false;
}

export async function executeWorkflowRules(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    include: {
      customer: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
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
    const shouldExecute = shouldExecuteWorkflow(rule.trigger, ticket);

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

      if (action.type === "generate-draft") {
        const result = await generateAiDraftReply({
          subject: ticket.subject,
          customerName: ticket.customer.name,
          customerMessage: ticket.messages[0]?.body ?? "",
        });

        await prisma.draft.create({
          data: {
            ticketId,
            body: result.draft,
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
