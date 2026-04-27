import { prisma } from "@/lib/prisma";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";

type WorkflowAction = {
  type: "change-status" | "assign-ticket" | "generate-draft";
  value: string;
};

type WorkflowRuleActions = WorkflowAction[];

type WorkflowTrigger = {
  field: "subject" | "priority" | "status";
  operator: "equals" | "contains";
  value: string;
};

function parseWorkflowTrigger(trigger: string): WorkflowTrigger | null {
  try {
    return JSON.parse(trigger) as WorkflowTrigger;
  } catch {
    return null;
  }
}

function shouldExecuteWorkflow(
  triggerValue: string,
  ticket: { subject: string; priority: string; status: string },
) {
  const trigger = parseWorkflowTrigger(triggerValue);

  if (!trigger) return false;

  const ticketValue = ticket[trigger.field]?.toLowerCase();
  const expectedValue = trigger.value.toLowerCase();

  if (trigger.operator === "equals") {
    return ticketValue === expectedValue;
  }

  if (trigger.operator === "contains") {
    return ticketValue.includes(expectedValue);
  }

  return false;
}

export async function executeWorkflowRules(
  ticketId: string,
  context?: { skipWorkflow?: boolean },
) {
  if (context?.skipWorkflow) {
    return {
      executed: false,
      message: "Skipped to prevent loop.",
    };
  }

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

  const existingWorkflowLogs = await prisma.activityLog.findMany({
    where: {
      ticketId,
      type: "workflow_executed",
    },
  });

  const executedRules: string[] = [];

  for (const rule of rules) {
    const shouldExecute = shouldExecuteWorkflow(rule.trigger, ticket);

    if (!shouldExecute) continue;

    const alreadyExecuted = existingWorkflowLogs.some((log) =>
      log.message.includes(rule.name),
    );

    if (alreadyExecuted) continue;

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
