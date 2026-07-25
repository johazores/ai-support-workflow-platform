import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  testLatestWorkflowDraftForTicket,
  WorkflowExecutionError,
} from "@/features/workflows/services/versioned-workflow-runtime";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  generateAiDraftReply: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketUpdateMany: vi.fn(),
  workflowFindFirst: vi.fn(),
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
      findFirst: mocks.workflowFindFirst,
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

const workflow = {
  id: "workflow-1",
  organizationId: "org-1",
  name: "Draft workflow",
  status: "active",
  currentVersion: 1,
};

const ticket = {
  id: "ticket-1",
  organizationId: "org-1",
  subject: "Need help",
  status: "open",
  priority: "normal",
  assigneeName: null,
  assigneeEmail: null,
  tagIds: [],
  customer: { name: "Customer" },
  messages: [{ body: "Please help" }],
};

const definition = {
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: { label: "When created", triggerType: "ticket-created" },
    },
    {
      id: "status-1",
      type: "action",
      position: { x: 250, y: 0 },
      data: {
        label: "Set pending",
        actionType: "change-status",
        value: "pending",
      },
    },
    {
      id: "draft-1",
      type: "action",
      position: { x: 500, y: 0 },
      data: {
        label: "Generate draft",
        actionType: "generate-draft",
        value: "",
      },
    },
  ],
  edges: [
    { id: "edge-1", source: "trigger-1", target: "status-1" },
    { id: "edge-2", source: "status-1", target: "draft-1" },
  ],
};

describe("safe workflow draft test mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.workflowFindFirst.mockResolvedValue(workflow);
    mocks.versionFindFirst.mockResolvedValue({
      id: "version-2",
      organizationId: "org-1",
      workflowId: "workflow-1",
      version: 2,
      status: "draft",
      definition,
    });
    mocks.ticketFindFirst.mockResolvedValue(ticket);
    mocks.executionFindFirst.mockResolvedValue(null);
    mocks.executionCreate.mockResolvedValue({ id: "execution-test-1" });
    mocks.executionUpdate.mockImplementation(
      async ({ data }: { data: object }) => ({
        id: "execution-test-1",
        workflowId: "workflow-1",
        workflowVersionId: "version-2",
        triggerType: "test",
        ...data,
      }),
    );
    let step = 0;
    mocks.stepCreate.mockImplementation(async () => ({ id: `step-${++step}` }));
    mocks.stepUpdate.mockResolvedValue({});
    mocks.ticketUpdateMany.mockResolvedValue({ count: 1 });
    mocks.activityCreate.mockResolvedValue({});
    mocks.generateAiDraftReply.mockResolvedValue({ draft: "AI output" });
    mocks.draftCreate.mockResolvedValue({ id: "saved-draft" });
  });

  it("walks the latest draft and persists test history without live writes", async () => {
    const execution = await testLatestWorkflowDraftForTicket({
      organizationId: "org-1",
      workflowId: "workflow-1",
      ticketId: "ticket-1",
      idempotencyKey: "test:user-1:run-1",
    });

    expect(mocks.versionFindFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", workflowId: "workflow-1" },
      orderBy: { version: "desc" },
    });
    expect(mocks.executionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        workflowId: "workflow-1",
        workflowVersionId: "version-2",
        triggerType: "test",
        status: "running",
        idempotencyKey: "test:user-1:run-1",
        input: { ticketId: "ticket-1", testMode: true },
      }),
    });
    expect(mocks.stepCreate).toHaveBeenCalledTimes(3);
    expect(mocks.ticketUpdateMany).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
    expect(mocks.generateAiDraftReply).not.toHaveBeenCalled();
    expect(mocks.draftCreate).not.toHaveBeenCalled();
    expect(mocks.executionUpdate).toHaveBeenLastCalledWith({
      where: { id: "execution-test-1" },
      data: expect.objectContaining({
        status: "succeeded",
        output: expect.objectContaining({
          testMode: true,
          preview: expect.objectContaining({ status: "pending" }),
        }),
      }),
    });
    expect(execution.status).toBe("succeeded");
  });

  it("records a failed test execution when a tenant reference is invalid", async () => {
    mocks.versionFindFirst.mockResolvedValueOnce({
      id: "version-2",
      organizationId: "org-1",
      workflowId: "workflow-1",
      version: 2,
      status: "draft",
      definition: {
        nodes: [
          definition.nodes[0],
          {
            id: "assign-1",
            type: "action",
            position: { x: 250, y: 0 },
            data: {
              label: "Assign",
              actionType: "assign-ticket",
              value: "missing@example.com",
            },
          },
        ],
        edges: [{ id: "edge-1", source: "trigger-1", target: "assign-1" }],
      },
    });
    mocks.userFindFirst.mockResolvedValueOnce(null);

    await expect(
      testLatestWorkflowDraftForTicket({
        organizationId: "org-1",
        workflowId: "workflow-1",
        ticketId: "ticket-1",
        idempotencyKey: "test:user-1:run-2",
      }),
    ).rejects.toMatchObject<Partial<WorkflowExecutionError>>({
      message: "Workflow assignee not found",
      executionId: "execution-test-1",
    });

    expect(mocks.executionUpdate).toHaveBeenLastCalledWith({
      where: { id: "execution-test-1" },
      data: expect.objectContaining({
        status: "failed",
        error: "Workflow assignee not found",
      }),
    });
    expect(mocks.ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("never loads a foreign tenant ticket", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce(null);

    await expect(
      testLatestWorkflowDraftForTicket({
        organizationId: "org-2",
        workflowId: "workflow-1",
        ticketId: "ticket-1",
        idempotencyKey: "test:user-2:run-1",
      }),
    ).rejects.toThrow("Ticket not found");

    expect(mocks.executionCreate).not.toHaveBeenCalled();
  });
});
