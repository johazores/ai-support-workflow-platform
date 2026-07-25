import type {
  WorkflowActionType,
  WorkflowConditionField,
  WorkflowConditionOperator,
  WorkflowTriggerType,
} from "@/features/workflows/types/workflow-definition";

export type WorkflowNodeRegistryEntry<T extends string> = {
  type: T;
  label: string;
  description: string;
};

export type WorkflowActionRegistryEntry =
  WorkflowNodeRegistryEntry<WorkflowActionType> & {
    valueRequired: boolean;
    valueKind: "none" | "status" | "priority" | "member" | "tag";
  };

export const workflowTriggerRegistry: readonly WorkflowNodeRegistryEntry<WorkflowTriggerType>[] =
  [
    {
      type: "manual",
      label: "Manual run",
      description: "Run the workflow explicitly for a ticket.",
    },
    {
      type: "ticket-created",
      label: "Ticket created",
      description: "Run when a new tenant-owned ticket is created.",
    },
    {
      type: "ticket-updated",
      label: "Ticket updated",
      description: "Run after a supported ticket mutation.",
    },
    {
      type: "message-received",
      label: "Message received",
      description: "Run when a customer message is ingested.",
    },
  ];

export const workflowConditionFieldRegistry: readonly WorkflowNodeRegistryEntry<WorkflowConditionField>[] =
  [
    {
      type: "subject",
      label: "Subject",
      description: "Compare the current ticket subject.",
    },
    {
      type: "priority",
      label: "Priority",
      description: "Compare the current ticket priority.",
    },
    {
      type: "status",
      label: "Status",
      description: "Compare the current ticket status.",
    },
  ];

export const workflowConditionOperatorRegistry: readonly WorkflowNodeRegistryEntry<WorkflowConditionOperator>[] =
  [
    {
      type: "equals",
      label: "Equals",
      description: "Continue when both values are equal.",
    },
    {
      type: "not-equals",
      label: "Does not equal",
      description: "Continue when both values differ.",
    },
    {
      type: "contains",
      label: "Contains",
      description: "Continue when the ticket value contains the comparison text.",
    },
  ];

export const workflowActionRegistry: readonly WorkflowActionRegistryEntry[] = [
  {
    type: "change-status",
    label: "Change status",
    description: "Set the ticket to a supported status.",
    valueRequired: true,
    valueKind: "status",
  },
  {
    type: "change-priority",
    label: "Change priority",
    description: "Set the ticket priority.",
    valueRequired: true,
    valueKind: "priority",
  },
  {
    type: "assign-ticket",
    label: "Assign ticket",
    description: "Assign to an active member of the same organization.",
    valueRequired: true,
    valueKind: "member",
  },
  {
    type: "add-tag",
    label: "Add tag",
    description: "Add a tag owned by the same organization.",
    valueRequired: true,
    valueKind: "tag",
  },
  {
    type: "generate-draft",
    label: "Generate AI draft",
    description: "Create an AI-assisted draft without sending it automatically.",
    valueRequired: false,
    valueKind: "none",
  },
];

export const supportedTicketStatuses = [
  "open",
  "pending",
  "resolved",
  "closed",
] as const;
export const supportedTicketPriorities = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export function getWorkflowActionDefinition(type: WorkflowActionType) {
  return workflowActionRegistry.find((entry) => entry.type === type);
}
