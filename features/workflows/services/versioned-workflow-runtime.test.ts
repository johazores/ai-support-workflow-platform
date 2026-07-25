import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimNextWorkflowExecution,
  enqueuePublishedWorkflowsForTicket,
  executeClaimedWorkflowExecution,
  requestWorkflowExecutionCancellation,
  type ClaimedWorkflowExecution,
} from "@/features/workflows/services/versioned-workflow-runtime";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  generateAiDraftReply: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketUpdateMany: vi.fn(),
  workflowFindMany: vi.fn(),
  workflowFindFirst: vi.fn(),
  versionFindFirst: vi.fn(),
  executionFindFirst: vi.fn(),
  executionFindUnique: vi.fn(),
  executionCreate: vi.fn(),
  executionDelete: vi.fn(),
  executionUpdate: vi.fn(),
  executionUpdateMany: vi.fn(),
  executionCount: vi.fn(),
  stepFindFirst: vi.fn(),
  stepFindUnique: vi.fn(),
  stepCreate: vi.fn(),
  stepUpdate: vi.fn(),
  stepUpdateMany: vi.fn(),
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

vi.mock("@/lib/structured-logger", () => ({
  redactLogValue: (value: unknown) => value,
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
      updateMany: mocks.ticketUpdateMany,
    },
    workflow: {
      findMany: mocks.workflowFindMany,
      findFirst: mocks.workflowFindFirst,
    },
    workflowVersion: {
      findFirst: mocks.versionFindFirst,
    },
    workflowExecution: {
      findFirst: mocks.executionFindFirst,
      findUnique: mocks.executionFindUnique,
      create: mocks.executionCreate,
      delete: mocks.executionDelete,
      update: mocks.executionUpdate,
      updateMany: mocks.executionUpdateMany,
      count: mocks.executionCount,
    },
    workflowExecutionStep: {
      findFirst: mocks.stepFindFirst,
      findUnique: mocks.stepFindUnique,
      create: mocks.stepCreate,
      update: mocks.stepUpdate,
      updateMany: mocks.stepUpdateMany,
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

function actionDefinition(action: {
  actionType:
    | "change-status"
    | "change-priority"
    | "assign-ticket"
    | "add-tag"
    | "generate-draft";
  value: string;
  triggerType?:
    | "manual"
    | "ticket-created"
    | "ticket-updated"
    | "message-received";
}) {
  return {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 0, y: 0 },
        data: {
          label: "Start",
          triggerType: action.triggerType ?? "manual",
        },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 250, y: 0 },
        data: {
          label: "Action",
          actionType: action.actionType,
          value: action.value,
        },
      },
    ],
    edges: [{ id: "edge-1", source: "trigger-1", target: "action-1" }],
  };
}

function version(
  definition = actionDefinition({
    actionType: "change-status",
    value: "pending",
  }),
) {
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

function execution(status = "queued") {
  return {
    id: "execution-1",
    organizationId: "org-1",
    workflowId: "workflow-1",
    workflowVersionId: "version-1",
    triggerType: "manual",
    status,
    idempotencyKey: "manual:event:workflow-1",
    input: { ticketId: "ticket-1", testMode: false },
    output: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function queueStep(overrides: Record<string, unknown> = {}) {
  return {
    id: "queue-step-1",
    organizationId: "org-1",
    executionId: "execution-1",
    nodeId: "__workflow_queue__",
    nodeType: "queue",
    status: "running",
    attempt: 1,
    input: {
      ticketId: "ticket-1",
      maxAttempts: 3,
      timeoutMs: 120_000,
    },
    output: null,
    error: "worker-1:lease-token",
    startedAt: new Date(),
    finishedAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function claim(overrides: Partial<ClaimedWorkflowExecution> = {}) {
  return {
    execution: execution("running"),
    queueStep: queueStep(),
    leaseToken: "worker-1:lease-token",
    workerId: "worker-1",
    leaseMs: 60_000,
    ...overrides,
  } as ClaimedWorkflowExecution;
}

describe("durable versioned workflow runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue(ticket);
    mocks.ticketUpdateMany.mockResolvedValue({ count: 1 });
    mocks.workflowFindMany.mockResolvedValue([workflow]);
    mocks.workflowFindFirst.mockResolvedValue(workflow);
    mocks.versionFindFirst.mockResolvedValue(version());
    mocks.executionFindFirst.mockResolvedValue(null);
    mocks.executionCreate.mockResolvedValue(execution());
    mocks.executionDelete.mockResolvedValue(execution());
    mocks.executionUpdate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...execution(String(data.status ?? "running")),
        ...data,
      }),
    );
    mocks.executionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.executionFindUnique.mockImplementation(
      async (input: { select?: { status?: boolean } }) =>
        input.select ? { status: "running" } : execution("succeeded"),
    );
    mocks.executionCount.mockResolvedValue(0);
    mocks.stepFindFirst.mockResolvedValue(null);
    mocks.stepFindUnique.mockResolvedValue(queueStep());
    let step = 0;
    mocks.stepCreate.mockImplementation(
      async (input: { data: Record<string, unknown> }) => ({
        id: `step-${++step}`,
        ...input.data,
      }),
    );
    mocks.stepUpdate.mockResolvedValue({});
    mocks.stepUpdateMany.mockResolvedValue({ count: 1 });
    mocks.activityCreate.mockResolvedValue({});
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.membershipFindUnique.mockResolvedValue(null);
    mocks.tagFindFirst.mockResolvedValue(null);
    mocks.generateAiDraftReply.mockResolvedValue({
      draft: "Suggested response",
      model: "model-1",
    });
    mocks.draftCreate.mockResolvedValue({ id: "draft-1" });
  });

  it("refuses a ticket outside the active organization before enqueueing", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce(null);

    await expect(
      enqueuePublishedWorkflowsForTicket({
        organizationId: "org-2",
        ticketId: "ticket-1",
        triggerType: "manual",
      }),
    ).rejects.toThrow("Ticket not found");

    expect(mocks.workflowFindMany).not.toHaveBeenCalled();
    expect(mocks.executionCreate).not.toHaveBeenCalled();
  });

  it("queues a published workflow without performing ticket side effects", async () => {
    const result = await enqueuePublishedWorkflowsForTicket({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "manual",
      workflowId: "workflow-1",
      idempotencyKey: "manual:event",
    });

    expect(mocks.executionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        workflowId: "workflow-1",
        workflowVersionId: "version-1",
        status: "queued",
        idempotencyKey: "manual:event:workflow-1",
      }),
    });
    expect(mocks.stepCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        executionId: "execution-1",
        nodeId: "__workflow_queue__",
        nodeType: "queue",
        status: "queued",
        attempt: 0,
        startedAt: expect.any(Date),
      }),
    });
    expect(mocks.ticketUpdateMany).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("deduplicates queued, running, cancelling, or successful event keys", async () => {
    const previous = execution("queued");
    mocks.executionFindFirst.mockResolvedValueOnce(previous);

    const result = await enqueuePublishedWorkflowsForTicket({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "manual",
      idempotencyKey: "manual:event",
    });

    expect(mocks.executionFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        workflowId: "workflow-1",
        idempotencyKey: "manual:event:workflow-1",
        status: {
          in: ["queued", "running", "cancelling", "succeeded"],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(mocks.executionCreate).not.toHaveBeenCalled();
    expect(result).toEqual([previous]);
  });

  it("atomically claims a due queue step and activates its execution", async () => {
    const dueStep = queueStep({
      status: "queued",
      attempt: 0,
      error: null,
      startedAt: new Date(Date.now() - 1_000),
      finishedAt: null,
    });
    mocks.stepFindFirst.mockResolvedValueOnce(dueStep);
    mocks.stepFindUnique.mockResolvedValueOnce(queueStep());
    mocks.executionFindUnique.mockResolvedValueOnce(execution("queued"));

    const claimed = await claimNextWorkflowExecution({
      workerId: "worker-1",
      leaseMs: 60_000,
    });

    expect(mocks.stepUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "queue-step-1",
        status: "queued",
        startedAt: { lte: expect.any(Date) },
      },
      data: {
        status: "running",
        attempt: { increment: 1 },
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date),
        error: expect.stringMatching(/^worker-1:/),
      },
    });
    expect(mocks.executionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "execution-1",
        status: { in: ["queued", "running"] },
      },
      data: {
        status: "running",
        startedAt: expect.any(Date),
        finishedAt: null,
        error: null,
      },
    });
    expect(claimed?.execution.id).toBe("execution-1");
  });

  it("executes a claimed workflow and records durable node steps", async () => {
    const currentClaim = claim();
    mocks.executionFindUnique.mockImplementation(
      async (input: { select?: { status?: boolean } }) =>
        input.select ? { status: "running" } : execution("succeeded"),
    );

    await executeClaimedWorkflowExecution(currentClaim);

    expect(mocks.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-1" },
      data: { organizationId: "org-1", status: "pending" },
    });
    expect(mocks.stepCreate).toHaveBeenCalledTimes(2);
    expect(mocks.executionUpdateMany).toHaveBeenCalledWith({
      where: { id: "execution-1", status: "running" },
      data: expect.objectContaining({
        status: "succeeded",
        error: null,
        finishedAt: expect.any(Date),
      }),
    });
    expect(mocks.stepUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "queue-step-1",
        status: "running",
        error: "worker-1:lease-token",
      },
      data: expect.objectContaining({
        status: "succeeded",
        error: null,
        finishedAt: expect.any(Date),
      }),
    });
  });

  it("schedules exponential retry for a transient action failure", async () => {
    mocks.versionFindFirst.mockResolvedValueOnce(
      version(
        actionDefinition({
          actionType: "generate-draft",
          value: "",
        }),
      ),
    );
    mocks.generateAiDraftReply.mockRejectedValueOnce(
      new Error("temporary provider outage"),
    );
    mocks.executionFindUnique.mockImplementation(
      async (input: { select?: { status?: boolean } }) =>
        input.select ? { status: "running" } : execution("queued"),
    );

    const result = await executeClaimedWorkflowExecution(claim());

    expect(mocks.executionUpdateMany).toHaveBeenCalledWith({
      where: { id: "execution-1", status: "running" },
      data: {
        status: "queued",
        error: "temporary provider outage",
        startedAt: null,
        finishedAt: null,
      },
    });
    expect(mocks.stepUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "queue-step-1",
        status: "running",
        error: "worker-1:lease-token",
      },
      data: expect.objectContaining({
        status: "queued",
        error: null,
        startedAt: expect.any(Date),
        finishedAt: null,
      }),
    });
    expect(result?.status).toBe("queued");
  });

  it("does not repeat a successful action when a retry resumes", async () => {
    mocks.stepFindFirst.mockImplementation(
      async (input: { where: { nodeId: string } }) => {
        if (input.where.nodeId === "action-1") {
          return {
            id: "previous-action-step",
            output: { status: "pending" },
          };
        }
        return null;
      },
    );

    await executeClaimedWorkflowExecution(claim());

    expect(mocks.ticketUpdateMany).not.toHaveBeenCalled();
    expect(mocks.stepCreate).toHaveBeenCalledTimes(1);
    expect(mocks.executionUpdateMany).toHaveBeenCalledWith({
      where: { id: "execution-1", status: "running" },
      data: expect.objectContaining({ status: "succeeded" }),
    });
  });

  it("cancels a queued execution immediately without a worker", async () => {
    mocks.executionFindFirst.mockResolvedValueOnce(execution("queued"));
    mocks.executionFindUnique.mockResolvedValueOnce(execution("cancelled"));

    const result = await requestWorkflowExecutionCancellation({
      organizationId: "org-1",
      executionId: "execution-1",
    });

    expect(mocks.executionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "execution-1",
        organizationId: "org-1",
        status: "queued",
      },
      data: {
        status: "cancelled",
        error: null,
        finishedAt: expect.any(Date),
      },
    });
    expect(mocks.stepUpdateMany).toHaveBeenCalledWith({
      where: {
        executionId: "execution-1",
        nodeId: "__workflow_queue__",
        nodeType: "queue",
        status: "queued",
      },
      data: {
        status: "cancelled",
        error: null,
        finishedAt: expect.any(Date),
      },
    });
    expect(result?.status).toBe("cancelled");
  });
});
