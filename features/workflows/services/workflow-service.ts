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

const validTriggerFields = ["subject", "priority", "status"] as const;
const validTriggerOperators = ["equals", "contains"] as const;

const validWorkflowActionTypes = [
  "change-status",
  "assign-ticket",
  "generate-draft",
] as const;

function isWorkflowTrigger(value: unknown): value is WorkflowTrigger {
  if (!value || typeof value !== "object") return false;

  const trigger = value as Record<string, unknown>;

  return (
    typeof trigger.field === "string" &&
    typeof trigger.operator === "string" &&
    typeof trigger.value === "string" &&
    validTriggerFields.includes(trigger.field as WorkflowTrigger["field"]) &&
    validTriggerOperators.includes(
      trigger.operator as WorkflowTrigger["operator"],
    )
  );
}

function parseWorkflowTrigger(trigger: string): WorkflowTrigger | null {
  try {
    const parsed = JSON.parse(trigger);

    return isWorkflowTrigger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isWorkflowAction(value: unknown): value is WorkflowAction {
  if (!value || typeof value !== "object") return false;

  const action = value as Record<string, unknown>;

  return (
    typeof action.type === "string" &&
    typeof action.value === "string" &&
    validWorkflowActionTypes.includes(action.type as WorkflowAction["type"])
  );
}

function parseWorkflowActions(actions: unknown): WorkflowRuleActions {
  if (!Array.isArray(actions)) return [];

  return actions.filter(isWorkflowAction);
}

function shouldExecuteWorkflow(
  triggerValue: string,
  ticket: { subject: string; priority: string; status: string },
) {
  const trigger = parseWorkflowTrigger(triggerValue);

  if (!trigger) return false;

  const ticketValue = ticket[trigger.field].toLowerCase();
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
  const executedActions: string[] = [];

  for (const rule of rules) {
    const shouldExecute = shouldExecuteWorkflow(rule.trigger, ticket);

    if (!shouldExecute) continue;

    const alreadyExecuted = existingWorkflowLogs.some((log) =>
      log.message.includes(rule.name),
    );

    if (alreadyExecuted) continue;

    const actions = parseWorkflowActions(rule.actions);

    if (actions.length === 0) continue;

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

        executedActions.push(`Changed status to ${action.value}`);
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

        executedActions.push(`Assigned ticket to ${action.value}`);
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

        executedActions.push("Generated AI draft");
      }
    }

    await prisma.activityLog.create({
      data: {
        ticketId,
        type: "workflow_executed",
        message: `Workflow executed: ${rule.name}. Actions: ${executedActions.join(", ")}.`,
      },
    });

    executedRules.push(rule.name);
  }

  return {
    executed: executedRules.length > 0,
    rules: executedRules,
  };
}
