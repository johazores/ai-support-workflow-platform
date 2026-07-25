import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-execution-service";

const mocks = vi.hoisted(() => ({
  ticketFindFirst: vi.fn(),
  ticketUpdate: vi.fn(),
  workflowRuleFindMany: vi.fn(),
  workflowExecutionFindFirst: vi.fn(),
  workflowExecutionCreate: vi.fn(),
  workflowExecutionUpdate: vi.fn(),
  workflowExecutionStepCreate: vi.fn(),
  workflowExecutionStepUpdate: vi.fn(),
  activityLogCreate: vi.fn(),
  userFindFirst: vi.fn(),
  organizationMemberFindUnique: vi.fn(),
  draftCreate: vi.fn(),
  ensureDefaultOrganization: vi.fn(),
  isLegacyOrganization: vi.fn(),
  addTagToTicket: vi.fn(),
  generateAiDraftReply: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
      update: mocks.ticketUpdate,
    },
    workflowRule: {
      findMany: mocks.workflowRuleFindMany,
    },
    workflowExecution: {
      findFirst: mocks.workflowExecutionFindFirst,
      create: mocks.workflowExecutionCreate,
      update: mocks.workflowExecutionUpdate,
    },
    workflowExecutionStep: {
      create: mocks.workflowExecutionStepCreate,
      update: mocks.workflowExecutionStepUpdate,
    },
    activityLog: {
      create: mocks.activityLogCreate,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    organizationMember: {
      findUnique: mocks.organizationMemberFindUnique,
    },
    draft: {
      create: mocks.draftCreate,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  ensureDefaultOrganization: mocks.ensureDefaultOrganization,
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/features/tags/services/tag-service", () => ({
  addTagToTicket: mocks.addTagToTicket,
}));

vi.mock("@/features/ai-drafts/services/ai-draft-service", () => ({
  generateAiDraftReply: mocks.generateAiDraftReply,
}));

const ticket = {
  id: "ticket-1",
  organizationId: "org-1",
  subject: "Billing problem",
  priority: "normal",
  status: "open",
  customer: { name: "Customer" },
  messages: [{ body: "Please help" }],
};

function matchingRule(actions: Array<{ type: string; value: string }>) {
  return {
    id: "rule-1",
    name: "Billing rule",
    organizationId: "org-1",
    trigger: JSON.stringify({
      field: "subject",
      operator: "contains",
      value: "billing",
    }),
    actions,
  };
}

describe("workflow execution tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ensureDefaultOrganization.mockResolvedValue({ id: "org-default" });
    mocks.ticketFindFirst.mockResolvedValue(ticket);
    mocks.ticketUpdate.mockResolvedValue({});
    mocks.workflowRuleFindMany.mockResolvedValue([]);
    mocks.workflowExecutionFindFirst.mockResolvedValue(null);
    mocks.workflowExecutionCreate.mockResolvedValue({ id: "execution-1" });
    mocks.workflowExecutionUpdate.mockResolvedValue({});
    mocks.workflowExecutionStepCreate.mockResolvedValue({ id: "step-1" });
    mocks.workflowExecutionStepUpdate.mockResolvedValue({});
    mocks.activityLogCreate.mockResolvedValue({});
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.organizationMemberFindUnique.mockResolvedValue(null);
    mocks.draftCreate.mockResolvedValue({ id: "draft-1" });
    mocks.addTagToTicket.mockResolvedValue(undefined);
    mocks.generateAiDraftReply.mockResolvedValue({ draft: "Draft reply" });
  });

  it("rejects a ticket outside the requested organization without changing ownership", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce(null);

    const result = await executeWorkflowRules("ticket-1", {
      organizationId: "org-2",
      triggerType: "manual",
    });

    expect(result).toEqual({ executed: false, message: "Ticket not found." });
    expect(mocks.ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1", organizationId: "org-2" },
      }),
    );
    expect(mocks.ticketUpdate).not.toHaveBeenCalled();
    expect(mocks.workflowRuleFindMany).not.toHaveBeenCalled();
  });

  it("allows legacy null tickets only for the default workspace migration path", async () => {
    mocks.isLegacyOrganization.mockResolvedValue(true);
    mocks.ticketFindFirst.mockResolvedValueOnce({
      ...ticket,
      organizationId: null,
    });

    await executeWorkflowRules("ticket-1", {
      organizationId: "org-default",
      triggerType: "manual",
    });

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "ticket-1",
          OR: [
            { organizationId: "org-default" },
            { organizationId: null },
          ],
        },
      }),
    );
    expect(mocks.ticketUpdate).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { organizationId: "org-default" },
    });
    expect(mocks.workflowRuleFindMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
    });
  });

  it("passes organization context into tag actions", async () => {
    mocks.workflowRuleFindMany.mockResolvedValueOnce([
      matchingRule([{ type: "add-tag", value: "tag-1" }]),
    ]);

    const result = await executeWorkflowRules("ticket-1", {
      organizationId: "org-1",
      triggerType: "manual",
    });

    expect(mocks.addTagToTicket).toHaveBeenCalledWith(
      "ticket-1",
      "tag-1",
      "org-1",
    );
    expect(result.executed).toBe(true);
  });

  it("fails assignment when the target user is not an active tenant member", async () => {
    mocks.workflowRuleFindMany.mockResolvedValueOnce([
      matchingRule([{ type: "assign-ticket", value: "agent@example.com" }]),
    ]);
    mocks.userFindFirst.mockResolvedValueOnce({
      id: "user-2",
      name: "Agent",
      email: "agent@example.com",
    });
    mocks.organizationMemberFindUnique.mockResolvedValueOnce({
      status: "suspended",
    });

    const result = await executeWorkflowRules("ticket-1", {
      organizationId: "org-1",
      triggerType: "manual",
    });

    expect(mocks.organizationMemberFindUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: "org-1",
          userId: "user-2",
        },
      },
      select: { status: true },
    });
    expect(mocks.ticketUpdate).not.toHaveBeenCalled();
    expect(mocks.workflowExecutionUpdate).toHaveBeenCalledWith({
      where: { id: "execution-1" },
      data: expect.objectContaining({ status: "failed" }),
    });
    expect(result.executed).toBe(false);
  });
});
