import { z } from "zod";
import type {
  WorkflowDefinition,
  WorkflowNode,
} from "@/features/workflows/types/workflow-definition";

const positionSchema = z.object({
  x: z.number().finite().min(-10_000).max(10_000),
  y: z.number().finite().min(-10_000).max(10_000),
});

const triggerNodeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.literal("trigger"),
  position: positionSchema,
  data: z.object({
    label: z.string().trim().min(1).max(100),
    triggerType: z.enum([
      "manual",
      "ticket-created",
      "ticket-updated",
      "message-received",
    ]),
  }),
});

const conditionNodeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.literal("condition"),
  position: positionSchema,
  data: z.object({
    label: z.string().trim().min(1).max(100),
    field: z.enum(["subject", "priority", "status"]),
    operator: z.enum(["equals", "not-equals", "contains"]),
    value: z.string().trim().max(500),
  }),
});

const actionNodeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.literal("action"),
  position: positionSchema,
  data: z.object({
    label: z.string().trim().min(1).max(100),
    actionType: z.enum([
      "change-status",
      "change-priority",
      "assign-ticket",
      "add-tag",
      "generate-draft",
    ]),
    value: z.string().trim().max(500),
  }),
});

const definitionSchema = z.object({
  nodes: z
    .array(
      z.discriminatedUnion("type", [
        triggerNodeSchema,
        conditionNodeSchema,
        actionNodeSchema,
      ]),
    )
    .max(100),
  edges: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        source: z.string().min(1).max(100),
        target: z.string().min(1).max(100),
      }),
    )
    .max(250),
});

const validStatuses = new Set(["open", "pending", "resolved", "closed"]);
const validPriorities = new Set(["low", "normal", "high", "urgent"]);

export class WorkflowDefinitionError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(issues[0] || "Invalid workflow definition");
    this.name = "WorkflowDefinitionError";
    this.issues = issues;
  }
}

function findCycle(definition: WorkflowDefinition) {
  const adjacency = new Map<string, string[]>();
  for (const node of definition.nodes) adjacency.set(node.id, []);
  for (const edge of definition.edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visiting.add(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return definition.nodes.some((node) => visit(node.id));
}

function getReachableNodeIds(definition: WorkflowDefinition, triggerId: string) {
  const adjacency = new Map<string, string[]>();
  for (const node of definition.nodes) adjacency.set(node.id, []);
  for (const edge of definition.edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const reachable = new Set<string>();
  const stack = [triggerId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return reachable;
}

function validateNodeConfiguration(node: WorkflowNode, issues: string[]) {
  if (node.type === "condition") {
    if (!node.data.value) {
      issues.push(`${node.data.label} requires a comparison value.`);
    }
    if (
      node.data.field === "status" &&
      node.data.value &&
      !validStatuses.has(node.data.value)
    ) {
      issues.push(`${node.data.label} has an invalid ticket status.`);
    }
    if (
      node.data.field === "priority" &&
      node.data.value &&
      !validPriorities.has(node.data.value)
    ) {
      issues.push(`${node.data.label} has an invalid ticket priority.`);
    }
    return;
  }

  if (node.type !== "action") return;

  if (
    node.data.actionType === "change-status" &&
    !validStatuses.has(node.data.value)
  ) {
    issues.push(`${node.data.label} must select a valid ticket status.`);
  }
  if (
    node.data.actionType === "change-priority" &&
    !validPriorities.has(node.data.value)
  ) {
    issues.push(`${node.data.label} must select a valid ticket priority.`);
  }
  if (
    ["assign-ticket", "add-tag"].includes(node.data.actionType) &&
    !node.data.value
  ) {
    issues.push(`${node.data.label} requires a configured value.`);
  }
}

export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  const parsed = definitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new WorkflowDefinitionError(
      parsed.error.issues.map((issue) => issue.message),
    );
  }

  const definition = parsed.data as WorkflowDefinition;
  const issues: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of definition.nodes) {
    if (nodeIds.has(node.id)) issues.push(`Duplicate node ID: ${node.id}`);
    nodeIds.add(node.id);
  }

  for (const edge of definition.edges) {
    if (edgeIds.has(edge.id)) issues.push(`Duplicate edge ID: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push(`Connection ${edge.id} references a missing node.`);
    }
    if (edge.source === edge.target) {
      issues.push(`Connection ${edge.id} cannot connect a node to itself.`);
    }
  }

  if (findCycle(definition)) {
    issues.push("Workflow connections must not contain a cycle.");
  }

  if (issues.length > 0) throw new WorkflowDefinitionError(issues);
  return definition;
}

export function validateWorkflowForPublish(input: unknown) {
  const definition = parseWorkflowDefinition(input);
  const issues: string[] = [];
  const triggers = definition.nodes.filter((node) => node.type === "trigger");
  const actions = definition.nodes.filter((node) => node.type === "action");

  if (triggers.length !== 1) {
    issues.push("A published workflow must contain exactly one trigger.");
  }
  if (actions.length === 0) {
    issues.push("A published workflow must contain at least one action.");
  }

  for (const node of definition.nodes) validateNodeConfiguration(node, issues);

  if (triggers.length === 1) {
    const trigger = triggers[0];
    const incomingToTrigger = definition.edges.some(
      (edge) => edge.target === trigger.id,
    );
    if (incomingToTrigger) {
      issues.push("The trigger node cannot have incoming connections.");
    }

    const reachable = getReachableNodeIds(definition, trigger.id);
    const disconnected = definition.nodes.filter(
      (node) => !reachable.has(node.id),
    );
    if (disconnected.length > 0) {
      issues.push(
        `Every node must be connected to the trigger. Disconnected: ${disconnected
          .map((node) => node.data.label)
          .join(", ")}.`,
      );
    }
  }

  if (issues.length > 0) throw new WorkflowDefinitionError(issues);
  return definition;
}
