export const workflowTriggerTypes = [
  "manual",
  "ticket-created",
  "ticket-updated",
  "message-received",
] as const;

export const workflowConditionFields = ["subject", "priority", "status"] as const;
export const workflowConditionOperators = [
  "equals",
  "not-equals",
  "contains",
] as const;
export const workflowActionTypes = [
  "change-status",
  "change-priority",
  "assign-ticket",
  "add-tag",
  "generate-draft",
] as const;

export type WorkflowTriggerType = (typeof workflowTriggerTypes)[number];
export type WorkflowConditionField = (typeof workflowConditionFields)[number];
export type WorkflowConditionOperator =
  (typeof workflowConditionOperators)[number];
export type WorkflowActionType = (typeof workflowActionTypes)[number];

export type WorkflowNodePosition = {
  x: number;
  y: number;
};

export type WorkflowTriggerNode = {
  id: string;
  type: "trigger";
  position: WorkflowNodePosition;
  data: {
    label: string;
    triggerType: WorkflowTriggerType;
  };
};

export type WorkflowConditionNode = {
  id: string;
  type: "condition";
  position: WorkflowNodePosition;
  data: {
    label: string;
    field: WorkflowConditionField;
    operator: WorkflowConditionOperator;
    value: string;
  };
};

export type WorkflowActionNode = {
  id: string;
  type: "action";
  position: WorkflowNodePosition;
  data: {
    label: string;
    actionType: WorkflowActionType;
    value: string;
  };
};

export type WorkflowNode =
  | WorkflowTriggerNode
  | WorkflowConditionNode
  | WorkflowActionNode;

export type WorkflowEdgeBranch = "true" | "false";

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  branch?: WorkflowEdgeBranch;
};

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export const emptyWorkflowDefinition: WorkflowDefinition = {
  nodes: [],
  edges: [],
};
