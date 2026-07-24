export type WorkflowTriggerType =
  | "manual"
  | "ticket-created"
  | "ticket-updated"
  | "message-received";

export type WorkflowConditionField = "subject" | "priority" | "status";
export type WorkflowConditionOperator =
  | "equals"
  | "not-equals"
  | "contains";

export type WorkflowActionType =
  | "change-status"
  | "change-priority"
  | "assign-ticket"
  | "add-tag"
  | "generate-draft";

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

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export const emptyWorkflowDefinition: WorkflowDefinition = {
  nodes: [],
  edges: [],
};
