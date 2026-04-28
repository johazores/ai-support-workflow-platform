import {
  parseWorkflowTrigger,
  shouldExecuteWorkflow,
  parseWorkflowActions,
} from "./workflow-utils";

describe("workflow utils", () => {
  test("parses valid trigger", () => {
    const trigger = JSON.stringify({
      field: "priority",
      operator: "equals",
      value: "high",
    });

    const result = parseWorkflowTrigger(trigger);

    expect(result).not.toBeNull();
    expect(result?.field).toBe("priority");
  });

  test("returns null for invalid trigger", () => {
    const result = parseWorkflowTrigger("invalid json");

    expect(result).toBeNull();
  });

  test("should execute equals trigger", () => {
    const trigger = JSON.stringify({
      field: "priority",
      operator: "equals",
      value: "high",
    });

    const result = shouldExecuteWorkflow(trigger, {
      subject: "Test",
      priority: "high",
      status: "open",
    });

    expect(result).toBe(true);
  });

  test("should execute contains trigger", () => {
    const trigger = JSON.stringify({
      field: "subject",
      operator: "contains",
      value: "account",
    });

    const result = shouldExecuteWorkflow(trigger, {
      subject: "Account issue",
      priority: "low",
      status: "open",
    });

    expect(result).toBe(true);
  });

  test("parses valid actions", () => {
    const actions = [
      { type: "change-status", value: "pending" },
      { type: "assign-ticket", value: "Team A" },
    ];

    const result = parseWorkflowActions(actions);

    expect(result.length).toBe(2);
  });

  test("filters invalid actions", () => {
    const actions = [
      { type: "invalid", value: "x" },
      { type: "change-status", value: "pending" },
    ];

    const result = parseWorkflowActions(actions);

    expect(result.length).toBe(1);
  });
});
