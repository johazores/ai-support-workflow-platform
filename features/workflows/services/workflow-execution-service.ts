import { prisma } from "@/lib/prisma";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";
import { addTagToTicket } from "@/features/tags/services/tag-service";
import {
  ensureDefaultOrganization,
  ensureLegacyOrganizationForUser,
} from "@/features/organizations/services/organization-service";

type WorkflowAction = {
  type: "change-status" | "assign-ticket" | "generate-draft" | "add-tag";
  value: string;
};

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
  "add-tag",
] as const;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown workflow error";
}

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

function parseWorkflowActions(actions: unknown): WorkflowAction[] {
  return Array.isArray(actions) ? actions.filter(isWorkflowAction) : [];
}

function shouldExecuteWorkflow(
  triggerValue: string,
  ticket: { subject: string; priority: string; status: string },
) {
  const trigger = parseWorkflowTrigger(triggerValue);
  if (!trigger) return false;

  const ticketValue = ticket[trigger.field].toLowerCase();
  const expectedValue = trigger.value.toLowerCase();

  return trigger.operator === "equals"
    ? ticketValue === expectedValue
    : ticketValue.includes(expectedValue);
}

async function executeAction(input: {
  action: WorkflowAction;
  organizationId: string;
  ticket: {
    id: string;
    subject: string;
    customer: { name: string };
    messages: Array<{ body: string }>;
  };
}) {
  const { action, organizationId, ticket } = input;

  if (action.type === "change-status") {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { organizationId, status: action.value },
    });
    return { message: `Changed status to ${action.value}` };
  }

  if (action.type === "assign-ticket") {
    const user = await prisma.user.findFirst({
      where: {
        status: "active",
        OR: [{ email: action.value }, { name: action.value }],
      },
    });

    if (!user) throw new Error(`Assignee ${action.value} was not found`);
    const membership = await ensureLegacyOrganizationForUser(user);
    if (membership.organizationId !== organizationId) {
      throw new Error(`Assignee ${action.value} is not in this organization`);
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        organizationId,
        assigneeName: user.name,
        assigneeEmail: user.email,
      },
    });
    return { message: `Assigned ticket to ${user.name}` };
  }

  if (action.type === "generate-draft") {
    const result = await generateAiDraftReply({
      subject: ticket.subject,
      customerName: ticket.customer.name,
      customerMessage: ticket.messages[0]?.body ?? "",
    });

    const draft = await prisma.draft.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        body: result.draft,
      },
    });
    return { message: "Generated AI draft", draftId: draft.id };
  }

  await addTagToTicket(ticket.id, action.value);
  return { message: `Added tag ${action.value}` };
}

export async function executeWorkflowRules(
  ticketId: string,
  context?: {
    skipWorkflow?: boolean;
    organizationId?: string;
    triggerType?: string;
  },
) {
  if (context?.skipWorkflow) {
    return { executed: false, message: "Skipped to prevent loop." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!ticket) return { executed: false, message: "Ticket not found." };

  const defaultOrganization = await ensureDefaultOrganization();
  const organizationId =
    context?.organizationId || ticket.organizationId || defaultOrganization.id;

  if (ticket.organizationId !== organizationId) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { organizationId },
    });
  }

  const rules = await prisma.workflowRule.findMany({
    where: {
      isActive: true,
      OR: [{ organizationId }, { organizationId: null }],
    },
  });

  const executedRules: string[] = [];
  const executionIds: string[] = [];

  for (const rule of rules) {
    if (!shouldExecuteWorkflow(rule.trigger, ticket)) continue;

    const actions = parseWorkflowActions(rule.actions);
    if (actions.length === 0) continue;

    const idempotencyKey = `legacy:${ticket.id}:${rule.id}`;
    const existingExecution = await prisma.workflowExecution.findFirst({
      where: {
        organizationId,
        idempotencyKey,
        status: { in: ["queued", "running", "succeeded"] },
      },
    });
    if (existingExecution) continue;

    const execution = await prisma.workflowExecution.create({
      data: {
        organizationId,
        workflowId: rule.id,
        workflowVersionId: rule.id,
        triggerType: context?.triggerType || "legacy-rule",
        status: "running",
        idempotencyKey,
        input: { ticketId: ticket.id, ruleId: rule.id },
        startedAt: new Date(),
      },
    });
    executionIds.push(execution.id);

    const actionMessages: string[] = [];
    let executionError: string | null = null;

    for (const [index, action] of actions.entries()) {
      const step = await prisma.workflowExecutionStep.create({
        data: {
          organizationId,
          executionId: execution.id,
          nodeId: `legacy-action-${index + 1}`,
          nodeType: action.type,
          status: "running",
          input: action,
          startedAt: new Date(),
        },
      });

      try {
        const output = await executeAction({
          action,
          organizationId,
          ticket,
        });
        actionMessages.push(output.message);

        await prisma.workflowExecutionStep.update({
          where: { id: step.id },
          data: {
            status: "succeeded",
            output,
            finishedAt: new Date(),
          },
        });
      } catch (error) {
        executionError = getErrorMessage(error);
        await prisma.workflowExecutionStep.update({
          where: { id: step.id },
          data: {
            status: "failed",
            error: executionError,
            finishedAt: new Date(),
          },
        });
        break;
      }
    }

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: executionError ? "failed" : "succeeded",
        output: executionError ? undefined : { actions: actionMessages },
        error: executionError,
        finishedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        ticketId,
        type: executionError ? "workflow_failed" : "workflow_executed",
        message: executionError
          ? `Workflow failed: ${rule.name}. ${executionError}`
          : `Workflow executed: ${rule.name}. Actions: ${actionMessages.join(", ")}.`,
      },
    });

    if (!executionError) executedRules.push(rule.name);
  }

  return {
    executed: executedRules.length > 0,
    rules: executedRules,
    executionIds,
  };
}
