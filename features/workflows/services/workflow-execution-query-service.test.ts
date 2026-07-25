import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWorkflowExecution,
  listWorkflowExecutions,
} from "@/features/workflows/services/workflow-execution-query-service";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  executionFindMany: vi.fn(),
  executionFindFirst: vi.fn(),
  stepFindMany: vi.fn(),
  workflowFindMany: vi.fn(),
  workflowFindFirst: vi.fn(),
  ruleFindMany: vi.fn(),
  ruleFindFirst: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflowExecution: {
      findMany: mocks.executionFindMany,
      findFirst: mocks.executionFindFirst,
    },
    workflowExecutionStep: {
      findMany: mocks.stepFindMany,
    },
    workflow: {
      findMany: mocks.workflowFindMany,
      findFirst: mocks.workflowFindFirst,
    },
    workflowRule: {
      findMany: mocks.ruleFindMany,
      findFirst: mocks.ruleFindFirst,
    },
  },
}));

describe("workflow execution queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.executionFindMany.mockResolvedValue([
      { id: "execution-1", workflowId: "workflow-1", organizationId: "org-1" },
      { id: "execution-2", workflowId: "legacy-1", organizationId: "org-1" },
    ]);
    mocks.workflowFindMany.mockResolvedValue([
      { id: "workflow-1", name: "Visual workflow" },
    ]);
    mocks.ruleFindMany.mockResolvedValue([
      { id: "legacy-1", name: "Legacy rule" },
    ]);
    mocks.stepFindMany.mockResolvedValue([]);
    mocks.workflowFindFirst.mockResolvedValue({ name: "Visual workflow" });
    mocks.ruleFindFirst.mockResolvedValue(null);
  });

  it("resolves both versioned and legacy workflow names", async () => {
    const executions = await listWorkflowExecutions("org-1");

    expect(executions.map((execution) => execution.workflowName)).toEqual([
      "Visual workflow",
      "Legacy rule",
    ]);
    expect(mocks.workflowFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        id: { in: ["workflow-1", "legacy-1"] },
      },
      select: { id: true, name: true },
    });
  });

  it("keeps execution detail tenant-scoped and prefers versioned metadata", async () => {
    mocks.executionFindFirst.mockResolvedValueOnce({
      id: "execution-1",
      workflowId: "workflow-1",
      organizationId: "org-1",
    });

    const execution = await getWorkflowExecution("org-1", "execution-1");

    expect(mocks.executionFindFirst).toHaveBeenCalledWith({
      where: { id: "execution-1", organizationId: "org-1" },
    });
    expect(execution?.workflowName).toBe("Visual workflow");
  });

  it("does not query metadata when the tenant execution does not exist", async () => {
    mocks.executionFindFirst.mockResolvedValueOnce(null);

    await expect(
      getWorkflowExecution("org-2", "execution-1"),
    ).resolves.toBeNull();
    expect(mocks.workflowFindFirst).not.toHaveBeenCalled();
    expect(mocks.ruleFindFirst).not.toHaveBeenCalled();
  });
});
