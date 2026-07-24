import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createVersionedWorkflow,
  getVersionedWorkflow,
  publishVersionedWorkflow,
  saveVersionedWorkflow,
} from "@/features/workflows/services/workflow-definition-service";
import type { WorkflowDefinition } from "@/features/workflows/types/workflow-definition";

const mocks = vi.hoisted(() => ({
  workflowFindFirst: vi.fn(),
  workflowCreate: vi.fn(),
  workflowUpdate: vi.fn(),
  workflowDeleteMany: vi.fn(),
  versionFindFirst: vi.fn(),
  versionCreate: vi.fn(),
  versionUpdate: vi.fn(),
  versionDeleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflow: {
      findFirst: mocks.workflowFindFirst,
      create: mocks.workflowCreate,
      update: mocks.workflowUpdate,
      deleteMany: mocks.workflowDeleteMany,
    },
    workflowVersion: {
      findFirst: mocks.versionFindFirst,
      create: mocks.versionCreate,
      update: mocks.versionUpdate,
      deleteMany: mocks.versionDeleteMany,
    },
  },
}));

const definition: WorkflowDefinition = {
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: { label: "Start", triggerType: "manual" },
    },
    {
      id: "action-1",
      type: "action",
      position: { x: 250, y: 0 },
      data: {
        label: "Set pending",
        actionType: "change-status",
        value: "pending",
      },
    },
  ],
  edges: [{ id: "edge-1", source: "trigger-1", target: "action-1" }],
};

const workflow = {
  id: "workflow-1",
  organizationId: "org-1",
  name: "Workflow",
  description: null,
  status: "draft",
  currentVersion: 1,
  createdByUserId: "user-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const draftVersion = {
  id: "version-1",
  organizationId: "org-1",
  workflowId: "workflow-1",
  version: 1,
  status: "draft",
  definition,
  createdByUserId: "user-1",
  publishedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("versioned workflow persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workflowFindFirst.mockResolvedValue(workflow);
    mocks.workflowCreate.mockResolvedValue(workflow);
    mocks.workflowUpdate.mockResolvedValue(workflow);
    mocks.workflowDeleteMany.mockResolvedValue({ count: 1 });
    mocks.versionFindFirst.mockResolvedValue(draftVersion);
    mocks.versionCreate.mockResolvedValue(draftVersion);
    mocks.versionUpdate.mockResolvedValue(draftVersion);
    mocks.versionDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("creates workflow metadata and version 1 draft together", async () => {
    const created = await createVersionedWorkflow({
      organizationId: "org-1",
      userId: "user-1",
      name: "Workflow",
      definition,
    });

    expect(mocks.workflowCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        currentVersion: 1,
        status: "draft",
      }),
    });
    expect(mocks.versionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        workflowId: "workflow-1",
        version: 1,
        status: "draft",
      }),
    });
    expect(created.version.version).toBe(1);
  });

  it("updates the current draft instead of creating needless versions", async () => {
    await saveVersionedWorkflow({
      organizationId: "org-1",
      userId: "user-1",
      workflowId: "workflow-1",
      name: "Updated",
      definition,
    });

    expect(mocks.versionUpdate).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: expect.objectContaining({ definition }),
    });
    expect(mocks.versionCreate).not.toHaveBeenCalled();
  });

  it("creates a new draft version when editing a published workflow", async () => {
    mocks.workflowFindFirst.mockResolvedValueOnce({
      ...workflow,
      status: "active",
      currentVersion: 1,
    });
    mocks.versionFindFirst.mockResolvedValueOnce({
      ...draftVersion,
      status: "published",
      publishedAt: new Date("2026-01-01T01:00:00Z"),
    });
    mocks.versionCreate.mockResolvedValueOnce({
      ...draftVersion,
      id: "version-2",
      version: 2,
    });
    mocks.workflowUpdate.mockResolvedValueOnce({
      ...workflow,
      currentVersion: 2,
      status: "draft",
    });

    const saved = await saveVersionedWorkflow({
      organizationId: "org-1",
      userId: "user-1",
      workflowId: "workflow-1",
      name: "Updated",
      definition,
    });

    expect(mocks.versionUpdate).not.toHaveBeenCalled();
    expect(mocks.versionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 2, status: "draft" }),
    });
    expect(saved.version.version).toBe(2);
  });

  it("publishes only the tenant-owned current version after validation", async () => {
    mocks.workflowUpdate.mockResolvedValueOnce({ ...workflow, status: "active" });
    mocks.versionUpdate.mockResolvedValueOnce({
      ...draftVersion,
      status: "published",
      publishedAt: new Date(),
    });

    const published = await publishVersionedWorkflow({
      organizationId: "org-1",
      workflowId: "workflow-1",
      userId: "user-1",
    });

    expect(mocks.workflowFindFirst).toHaveBeenCalledWith({
      where: {
        id: "workflow-1",
        organizationId: "org-1",
        status: { not: "archived" },
      },
    });
    expect(mocks.versionUpdate).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: expect.objectContaining({ status: "published" }),
    });
    expect(published.version.status).toBe("published");
  });

  it("does not expose a foreign workflow", async () => {
    mocks.workflowFindFirst.mockResolvedValueOnce(null);

    await expect(getVersionedWorkflow("org-2", "workflow-1")).resolves.toBeNull();
    expect(mocks.versionFindFirst).not.toHaveBeenCalled();
  });
});
