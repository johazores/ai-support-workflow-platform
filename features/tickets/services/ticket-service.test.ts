import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignTicket,
  getTicketById,
  updateTicketStatus,
} from "@/features/tickets/services/ticket-service";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  requireMembership: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  activityCreate: vi.fn(),
  dispatchWorkflows: vi.fn(),
  publishTicketEvent: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
  requireOrganizationMembership: mocks.requireMembership,
}));

vi.mock("@/features/workflows/services/workflow-event-service", () => ({
  dispatchTicketUpdatedWorkflows: mocks.dispatchWorkflows,
}));

vi.mock("@/features/tickets/services/ticket-event-bus", () => ({
  publishTicketEvent: mocks.publishTicketEvent,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
      update: mocks.ticketUpdate,
    },
    user: {
      findUnique: mocks.userFindUnique,
    },
    activityLog: {
      create: mocks.activityCreate,
    },
  },
}));

const ticket = {
  id: "ticket-1",
  organizationId: "org-1",
  status: "open",
  priority: "normal",
};

describe("ticket service tenant mutation boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue(ticket);
    mocks.ticketUpdate.mockResolvedValue(ticket);
    mocks.activityCreate.mockResolvedValue({ id: "activity-1" });
    mocks.dispatchWorkflows.mockResolvedValue([]);
    mocks.requireMembership.mockResolvedValue({
      organizationId: "org-1",
      role: "agent",
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-2",
      name: "Agent",
      email: "agent@example.com",
      status: "active",
    });
  });

  it("does not expose legacy-null tickets to a normal organization", async () => {
    await getTicketById("ticket-1", "org-1");

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1", organizationId: "org-1" },
      }),
    );
  });

  it("allows the deterministic legacy workspace to read null-owned tickets", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);

    await getTicketById("legacy-ticket", "org-default");

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "legacy-ticket",
          OR: [
            { organizationId: "org-default" },
            { organizationId: null },
          ],
        },
      }),
    );
  });

  it("dispatches ticket-updated workflows with the persisted activity ID", async () => {
    await updateTicketStatus("ticket-1", "pending", "org-1");

    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        ticketId: "ticket-1",
        type: "status_changed",
        message: "Ticket status changed to pending.",
      },
    });
    expect(mocks.dispatchWorkflows).toHaveBeenCalledWith({
      organizationId: "org-1",
      ticketId: "ticket-1",
      eventId: "activity-1",
    });
    expect(mocks.publishTicketEvent).toHaveBeenCalledWith(
      "ticket-1",
      "status-changed",
      { status: "pending" },
    );
  });

  it("rejects assignment when the target user is not an active tenant member", async () => {
    mocks.requireMembership.mockResolvedValueOnce(null);

    await expect(
      assignTicket({
        organizationId: "org-1",
        ticketId: "ticket-1",
        assigneeName: "Agent",
        assigneeEmail: "agent@example.com",
      }),
    ).rejects.toThrow("Assignee is not a member of this organization");
    expect(mocks.ticketUpdate).not.toHaveBeenCalled();
    expect(mocks.dispatchWorkflows).not.toHaveBeenCalled();
  });
});
