import { describe, expect, it } from "vitest";
import {
  parseWorkflowDefinition,
  validateWorkflowForPublish,
  WorkflowDefinitionError,
} from "@/features/workflows/services/workflow-definition-validation";
import type { WorkflowDefinition } from "@/features/workflows/types/workflow-definition";

function validDefinition(): WorkflowDefinition {
  return {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 0, y: 0 },
        data: { label: "Start", triggerType: "manual" },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 250, y: 0 },
        data: {
          label: "Urgent only",
          field: "priority",
          operator: "equals",
          value: "urgent",
        },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 500, y: -80 },
        data: {
          label: "Move to pending",
          actionType: "change-status",
          value: "pending",
        },
      },
      {
        id: "action-2",
        type: "action",
        position: { x: 500, y: 100 },
        data: {
          label: "Generate a draft",
          actionType: "generate-draft",
          value: "",
        },
      },
    ],
    edges: [
      { id: "edge-1", source: "trigger-1", target: "condition-1" },
      {
        id: "edge-2",
        source: "condition-1",
        target: "action-1",
        branch: "true",
      },
      {
        id: "edge-3",
        source: "condition-1",
        target: "action-2",
        branch: "false",
      },
    ],
  };
}

describe("workflow definition validation", () => {
  it("allows incomplete drafts while preserving graph integrity", () => {
    const definition: WorkflowDefinition = {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { label: "Start", triggerType: "manual" },
        },
      ],
      edges: [],
    };

    expect(parseWorkflowDefinition(definition)).toEqual(definition);
  });

  it("accepts a connected executable workflow for publish", () => {
    const definition = validDefinition();
    expect(validateWorkflowForPublish(definition)).toEqual(definition);
  });

  it("rejects cycles", () => {
    const definition = validDefinition();
    definition.edges.push({
      id: "edge-cycle",
      source: "action-1",
      target: "condition-1",
    });

    expect(() => parseWorkflowDefinition(definition)).toThrow(
      WorkflowDefinitionError,
    );
    expect(() => parseWorkflowDefinition(definition)).toThrow("cycle");
  });

  it("rejects disconnected publish nodes", () => {
    const definition = validDefinition();
    definition.nodes.push({
      id: "action-3",
      type: "action",
      position: { x: 750, y: 200 },
      data: {
        label: "Disconnected action",
        actionType: "change-priority",
        value: "high",
      },
    });

    expect(() => validateWorkflowForPublish(definition)).toThrow(
      "Every node must be connected",
    );
  });

  it("rejects invalid executable values at publish time", () => {
    const definition = validDefinition();
    const action = definition.nodes.find((node) => node.id === "action-1");
    if (!action || action.type !== "action") throw new Error("Missing action");
    action.data.value = "not-a-status";

    expect(() => validateWorkflowForPublish(definition)).toThrow(
      "valid ticket status",
    );
  });

  it("requires explicit true or false connections from conditions", () => {
    const definition = validDefinition();
    const branch = definition.edges.find((edge) => edge.id === "edge-2");
    if (!branch) throw new Error("Missing branch edge");
    delete branch.branch;

    expect(() => parseWorkflowDefinition(definition)).toThrow(
      "must choose true or false",
    );
  });

  it("rejects duplicate branches from the same condition", () => {
    const definition = validDefinition();
    const falseBranch = definition.edges.find((edge) => edge.id === "edge-3");
    if (!falseBranch) throw new Error("Missing branch edge");
    falseBranch.branch = "true";

    expect(() => parseWorkflowDefinition(definition)).toThrow(
      "only one true connection",
    );
  });

  it("rejects branch metadata on non-condition nodes", () => {
    const definition = validDefinition();
    const triggerEdge = definition.edges.find((edge) => edge.id === "edge-1");
    if (!triggerEdge) throw new Error("Missing trigger edge");
    triggerEdge.branch = "true";

    expect(() => parseWorkflowDefinition(definition)).toThrow(
      "Only condition nodes",
    );
  });
});
