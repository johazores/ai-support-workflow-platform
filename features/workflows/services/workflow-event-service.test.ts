import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchTicketUpdatedWorkflows } from "@/features/workflows/services/workflow-event-service";

const mocks = vi.hoisted(() => ({
  executeLegacy: vi.fn(),
  executeVersioned: vi.fn(),
}));

vi.mock("@/features/workflows/services/workflow-service", () => ({
  executeWorkflowRules: mocks.executeLegacy,
}));

vi.mock("@/features/workflows/services/versioned-workflow-runtime", () => ({
  executePublishedWorkflowsForTicket: mocks.executeVersioned,
}));

describe("ticket updated workflow dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeLegacy.mockResolvedValue({ executed: false, rules: [] });
    mocks.executeVersioned.mockResolvedValue([{ id: "execution-1" }]);
  });

  it("runs legacy migration rules before the published graph runtime", async () => {
    const result = await dispatchTicketUpdatedWorkflows({
      organizationId: "org-1",
      ticketId: "ticket-1",
      eventId: "activity-1",
    });

    expect(mocks.executeLegacy).toHaveBeenCalledWith("ticket-1", {
      organizationId: "org-1",
      triggerType: "ticket-updated",
    });
    expect(mocks.executeVersioned).toHaveBeenCalledWith({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "ticket-updated",
      idempotencyKey: "ticket-updated:activity-1",
    });
    expect(
      mocks.executeLegacy.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.executeVersioned.mock.invocationCallOrder[0]);
    expect(result).toEqual([{ id: "execution-1" }]);
  });

  it("still runs published workflows when a legacy rule fails", async () => {
    mocks.executeLegacy.mockRejectedValueOnce(new Error("legacy failed"));

    await expect(
      dispatchTicketUpdatedWorkflows({
        organizationId: "org-1",
        ticketId: "ticket-1",
        eventId: "activity-1",
      }),
    ).resolves.toEqual([{ id: "execution-1" }]);

    expect(mocks.executeVersioned).toHaveBeenCalledTimes(1);
  });

  it("does not fail a completed ticket mutation when graph execution fails", async () => {
    mocks.executeVersioned.mockRejectedValueOnce(new Error("graph failed"));

    await expect(
      dispatchTicketUpdatedWorkflows({
        organizationId: "org-1",
        ticketId: "ticket-1",
        eventId: "activity-1",
      }),
    ).resolves.toEqual([]);
  });
});
