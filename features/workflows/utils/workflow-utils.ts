export type WorkflowTrigger = {
  field: "subject" | "priority" | "status";
  operator: "equals" | "contains";
  value: string;
};

export type WorkflowAction = {
  type: "change-status" | "assign-ticket" | "generate-draft" | "add-tag";
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

export function isWorkflowTrigger(value: unknown): value is WorkflowTrigger {
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

export function parseWorkflowTrigger(trigger: string): WorkflowTrigger | null {
  try {
    const parsed = JSON.parse(trigger);
    return isWorkflowTrigger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function shouldExecuteWorkflow(
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

export function isWorkflowAction(value: unknown): value is WorkflowAction {
  if (!value || typeof value !== "object") return false;

  const action = value as Record<string, unknown>;

  return (
    typeof action.type === "string" &&
    typeof action.value === "string" &&
    validWorkflowActionTypes.includes(action.type as WorkflowAction["type"])
  );
}

export function parseWorkflowActions(actions: unknown): WorkflowAction[] {
  if (!Array.isArray(actions)) return [];

  return actions.filter(isWorkflowAction);
}
