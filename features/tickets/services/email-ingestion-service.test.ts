import { beforeEach, describe, expect, it, vi } from "vitest";
import { processInboundEmail } from "@/features/tickets/services/email-ingestion-service";

const mocks = vi.hoisted(() => ({
  messageFindFirst: vi.fn(),
  messageCreate: vi.fn(),
  customerFindFirst: vi.fn(),
  customerCreate: vi.fn(),
  ticketCreate: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketUpdate: vi.fn(),
  activityCreate: vi.fn(),
  classifyTicket: vi.fn(),
  executeWorkflowRules: vi.fn(),
  executePublishedWorkflows: vi.fn(),
  notifyAdmins: vi.fn(),
  notifyAssignee: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      findFirst: mocks.messageFindFirst,
      create: mocks.messageCreate,
    },
    customer: {
      findFirst: mocks.customerFindFirst,
      create: mocks.customerCreate,
    },
    ticket: {
      create: mocks.ticketCreate,
      findFirst: mocks.ticketFindFirst,
      update: mocks.ticketUpdate,
    },
    activityLog: {
      create: mocks.activityCreate,
    },
  },
}));

vi.mock("@/features/ai-drafts/services/classification-service", () => ({
  classifyTicket: mocks.classifyTicket,
}));

vi.mock("@/features/workflows/services/workflow-service", () => ({
  executeWorkflowRules: mocks.executeWorkflowRules,
}));

vi.mock("@/features/workflows/services/versioned-workflow-runtime", () => ({
  executePublishedWorkflowsForTicket: mocks.executePublishedWorkflows,
}));

vi.mock("@/features/notifications/services/notification-service", () => ({
  notifyAdmins: mocks.notifyAdmins,
  notifyAssignee: mocks.notifyAssignee,
}));

const input = {
  organizationId: "org-1",
  from: "customer@example.com",
  fromName: "Customer",
  subject: "Need help",
  body: "Something is broken",
  messageId: "message-1",
  mailboxId: "mailbox-1",
};

describe("email-ingestion-service tenant boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.customerFindFirst.mockResolvedValue({ id: "customer-1" });
    mocks.ticketCreate.mockResolvedValue({ id: "ticket-1" });
    mocks.messageCreate.mockResolvedValue({ id: "stored-message-1" });
    mocks.ticketFindFirst.mockResolvedValue({ status: "open" });
    mocks.ticketUpdate.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.classifyTicket.mockResolvedValue({
      priority: "high",
      category: "bug-report",
    });
    mocks.executeWorkflowRules.mockResolvedValue({ executed: false, rules: [] });
    mocks.executePublishedWorkflows.mockResolvedValue([]);
    mocks.notifyAdmins.mockResolvedValue(undefined);
    mocks.notifyAssignee.mockResolvedValue(undefined);
  });

  it("returns an existing organization message without creating duplicate data", async () => {
    mocks.messageFindFirst.mockResolvedValueOnce({
      id: "stored-message-1",
      ticketId: "ticket-1",
    });

    await expect(processInboundEmail(input)).resolves.toEqual({
      ticketId: "ticket-1",
      messageId: "stored-message-1",
      isNewTicket: false,
      isDuplicate: true,
    });

    expect(mocks.messageFindFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", externalMessageId: "message-1" },
      select: { id: true, ticketId: true },
    });
    expect(mocks.customerFindFirst).not.toHaveBeenCalled();
    expect(mocks.ticketCreate).not.toHaveBeenCalled();
    expect(mocks.executePublishedWorkflows).not.toHaveBeenCalled();
  });

  it("creates a tenant-owned ticket and runs created/message triggers", async () => {
    mocks.messageFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await processInboundEmail({
      ...input,
      inReplyTo: "missing-parent",
    });

    expect(result).toEqual({
      ticketId: "ticket-1",
      messageId: "stored-message-1",
      isNewTicket: true,
      isDuplicate: false,
    });
    expect(mocks.ticketCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        customerId: "customer-1",
        mailboxId: "mailbox-1",
      }),
    });
    expect(mocks.classifyTicket).toHaveBeenCalledWith(
      "ticket-1",
      "Need help",
      "Something is broken",
      "org-1",
    );
    expect(mocks.executePublishedWorkflows).toHaveBeenCalledWith({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "message-received",
      idempotencyKey: "message-received:stored-message-1",
    });
    expect(mocks.executePublishedWorkflows).toHaveBeenCalledWith({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "ticket-created",
      idempotencyKey: "ticket-created:ticket-1",
    });
    expect(mocks.notifyAdmins).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ ticketId: "ticket-1" }),
    );
    expect(mocks.notifyAssignee).not.toHaveBeenCalled();
  });

  it("reopens and notifies the assignee for a known tenant reply", async () => {
    mocks.messageFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ticketId: "ticket-1" });
    mocks.ticketFindFirst.mockResolvedValue({ status: "resolved" });

    const result = await processInboundEmail({
      ...input,
      inReplyTo: "parent-message",
    });

    expect(result.isNewTicket).toBe(false);
    expect(mocks.ticketCreate).not.toHaveBeenCalled();
    expect(mocks.ticketUpdate).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { status: "open" },
    });
    expect(mocks.executeWorkflowRules).toHaveBeenCalledWith("ticket-1", {
      organizationId: "org-1",
      triggerType: "inbound-email",
    });
    expect(mocks.executePublishedWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.executePublishedWorkflows).toHaveBeenCalledWith({
      organizationId: "org-1",
      ticketId: "ticket-1",
      triggerType: "message-received",
      idempotencyKey: "message-received:stored-message-1",
    });
    expect(mocks.notifyAssignee).toHaveBeenCalledWith(
      "org-1",
      "ticket-1",
      expect.objectContaining({ type: "customer-reply" }),
    );
    expect(mocks.notifyAdmins).not.toHaveBeenCalled();
  });

  it("does not lose an inbound email when an automation fails", async () => {
    mocks.messageFindFirst.mockResolvedValueOnce(null);
    mocks.executePublishedWorkflows.mockRejectedValueOnce(
      new Error("workflow failed"),
    );

    await expect(processInboundEmail(input)).resolves.toEqual({
      ticketId: "ticket-1",
      messageId: "stored-message-1",
      isNewTicket: true,
      isDuplicate: false,
    });

    expect(mocks.notifyAdmins).toHaveBeenCalled();
  });
});
