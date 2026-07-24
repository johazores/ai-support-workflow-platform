import { beforeEach, describe, expect, it, vi } from "vitest";
import { executePublishedWorkflowsForTicket } from "@/features/workflows/services/versioned-workflow-runtime";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  generateAiDraftReply: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketUpdateMany: vi.fn(),
  workflowFindMany: vi.fn(),
  versionFindFirst: vi.fn(),
  executionFindFirst: vi.fn(),
  executionCreate: vi.fn(),
  executionUpdate: vi.fn(),
  stepCreate: vi.fn(),
  stepUpdate: vi.fn(),
  activityCreate: vi.fn(),
  userFindFirst: vi.fn(),
  membershipFindUnique: vi.fn(),
  tagFindFirst: vi.fn(),
  draftCreate: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/features/ai-drafts/services/ai-draft-service", () => ({
  generateAiDraftReply: mocks.generateAiDraftReply,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
      updateMany: mocks.ticketUpdateMany,
    },
    workflow: {
      findMany: mocks.workflowFindMany,
    },
    workflowVersion: {
      findFirst: mocks.versionFindFirst,
    },
    workflowExecution: {
      findFirst: mocks.executionFindFirst,
      create: mocks.executionCreate,
      update: mocks.executionUpdate,
    },
    workflowExecutionStep: {
      create: mocks.stepCreate,
      update: mocks.stepUpdate,
    },
    activityLog: {
      create: mocks.activityCreate,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    organizationMember: {
      findUnique: mocks.membershipFindUnique,
    },
    tag: {
      findFirst: mocks.tagFindFirst,
    },
    draft: {
      create: mocks.draftCreate,
    },
  },
}));

const ticket = {
  id: "ticket-1",
  organizationId: "org-1",
  subject: "Production outage",
  status: "open",
  priority: "urgent",
  assigneeName: null,
  assigneeEmail: null,
  tagIds: [],
  customer: { name: "Customer" },
  messages: [{ body: "Everything is down" }],
};

const workflow = {
  id: "workflow-1",
  organizationId: "org-1",
  name: "Escalate urgent tickets",
  description: null,
  status: "active",
  currentVersion: 1,
  createdByUserId: "user-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function version(definition: object) {
  return {
    id: "version-1",
    organizationId: "org-1",
    workflowId: "workflow-1",
    version: 1,
    status: "published",
    definition,
    createdByUserId: "user-1",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function actionDefinition(action: {
  actionType:
    | "change-status"
    | "change-priority"
    | "assign-ticket"
    | "add-tag"
    | "generate-draft";
  value: string;
}) {
  return {
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
        data: { label: "Action", ...action },
      },
    ],
    edges: [{ id: "edge-1", source: "trigger-1", target: "action-1" }],
  };
}

describe("versioned workflow runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue(ticket);
    mocks.ticketUpdateMany.mockResolvedValue({ count: 1 });
    mocks.workflowFindMany.mockResolvedValue([workflow]);
    mocks.executionFindFirst.mockResolvedValue(null);
    mocks.executionCreate.mockResolvedValue({ id: "execution-1" });
    mocks.executionUpdate.mockImplementation(
      async ({ data }: { data: object }) => ({ id: "execution-1", ...data }),
    );
    let step = 0;
    mocks.stepCreate.mockImplementation(async () => ({ id: `step-${++step}` }));
    mocks.stepUpdate.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.membershipFindUnique.mockResolvedValue(null);
    mocks.tagFindFirst.mockResolvedValue(null);
    mocks.generateAiDraftReply.mockResolvedValue({ draft: "Suggested response" });
    mocks.draftCreate.mockResolvedValue({ id: "draft-1" });
  });

  it("refuses a ticket outside the active organization", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce(null);

    await expect(
      executePublishedWorkflowsForTicket({
        organizationId: "org-2",
        ticketId: "ticket-1",
        triggerType: "manual",
      }),
    ).rejects.toThrow("Ticket not found");

    expect(mocks.workflowFindMany).not.toHaveBeenCalled();
  });

  it("executes a connected status action and records durable steps", async () => {
    mocks.versionFindFirst.mockResolvedValueOnce(
      version(actionDefinition({ actionType: "change-status", value: "pending" })),
    );

    const executions = await executePublishedWorkflowsForTicket({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "manual",
      workflowId: "workflow-1",
    });

    expect(mocks.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-1" },
      data: { organizationId: "org-1", status: "pending" },
    });
    expect(mocks.stepCreate).toHaveBeenCalledTimes(2);
    expect(mocks.executionUpdate).toHaveBeenLastCalledWith({
      where: { id: "execution-1" },
      data: expect.objectContaining({ status: "succeeded" }),
    });
    expect(executions).toHaveLength(1);
  });

  it("follows the false branch when a condition does not match", async () => {
    mocks.versionFindFirst.mockResolvedValueOnce(
      version({
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
              label: "Low priority?",
              field: "priority",
              operator: "equals",
              value: "low",
            },
          },
          {
            id: "true-action",
            type: "action",
            position: { x: 500, y: -80 },
            data: {
              label: "Close",
              actionType: "change-status",
              value: "closed",
            },
          },
          {
            id: "false-action",
            type: "action",
            position: { x: 500, y: 80 },
            data: {
              label: "Keep pending",
              actionType: "change-status",
              value: "pending",
            },
          },
        ],
        edges: [
          { id: "edge-1", source: "trigger-1", target: "condition-1" },
          {
            id: "edge-2",
            source: "condition-1",
            target: "true-action",
            branch: "true",
          },
          {
            id: "edge-3",
            source: "condition-1",
            target: "false-action",
            branch: "false",
          },
        ],
      }),
    );

    await executePublishedWorkflowsForTicket({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "manual",
    });

    expect(mocks.ticketUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-1" },
      data: { organizationId: "org-1", status: "pending" },
    });
    expect(mocks.stepCreate).toHaveBeenCalledTimes(3);
  });

  it("creates a real AI draft instead of falling through to tag handling", async () => {
    mocks.versionFindFirst.mockResolvedValueOnce(
      version(actionDefinition({ actionType: "generate-draft", value: "" })),
    );

    await executePublishedWorkflowsForTicket({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "manual",
    });

    expect(mocks.generateAiDraftReply).toHaveBeenCalledWith({
      organizationId: "org-1",
      subject: "Production outage",
      customerName: "Customer",
      customerMessage: "Everything is down",
    });
    expect(mocks.draftCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        ticketId: "ticket-1",
        body: "Suggested response",
      },
    });
    expect(mocks.tagFindFirst).not.toHaveBeenCalled();
  });

  it("deduplicates an in-flight or successful event key for the same workflow", async () => {
    const previous = { id: "existing-execution", status: "succeeded" };
    mocks.versionFindFirst.mockResolvedValueOnce(
      version({
        ...actionDefinition({ actionType: "change-priority", value: "high" }),
        nodes: actionDefinition({ actionType: "change-priority", value: "high" }).nodes.map(
          (node) =>
            node.type === "trigger"
              ? {
                  ...node,
                  data: { ...node.data, triggerType: "ticket-created" },
                }
              : node,
        ),
      }),
    );
    mocks.executionFindFirst.mockResolvedValueOnce(previous);

    const executions = await executePublishedWorkflowsForTicket({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "ticket-created",
      idempotencyKey: "ticket-created:ticket-1",
    });

    expect(mocks.executionFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        workflowId: "workflow-1",
        idempotencyKey: "ticket-created:ticket-1:workflow-1",
        status: { in: ["queued", "running", "succeeded"] },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(mocks.executionCreate).not.toHaveBeenCalled();
    expect(executions).toEqual([previous]);
  });
});
