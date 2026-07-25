import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkUpdateTickets } from "@/features/tickets/services/bulk-ticket-service";

const mocks = vi.hoisted(() => ({
  ticketFindMany: vi.fn(),
  ticketUpdateMany: vi.fn(),
  activityCreateMany: vi.fn(),
  userFindFirst: vi.fn(),
  organizationMemberFindUnique: vi.fn(),
  isLegacyOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: mocks.ticketFindMany,
      updateMany: mocks.ticketUpdateMany,
    },
    activityLog: {
      createMany: mocks.activityCreateMany,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    organizationMember: {
      findUnique: mocks.organizationMemberFindUnique,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

describe("bulk ticket tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindMany.mockResolvedValue([
      { id: "ticket-1" },
      { id: "ticket-2" },
    ]);
    mocks.ticketUpdateMany.mockResolvedValue({ count: 2 });
    mocks.activityCreateMany.mockResolvedValue({ count: 2 });
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.organizationMemberFindUnique.mockResolvedValue(null);
  });

  it("rejects the complete operation when any requested ticket is outside the tenant", async () => {
    mocks.ticketFindMany.mockResolvedValueOnce([{ id: "ticket-1" }]);

    await expect(
      bulkUpdateTickets({
        organizationId: "org-1",
        ticketIds: ["ticket-1", "foreign-ticket"],
        action: { type: "change-status", value: "pending" },
      }),
    ).rejects.toThrow("One or more tickets not found");

    expect(mocks.ticketFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["ticket-1", "foreign-ticket"] },
        organizationId: "org-1",
      },
      select: { id: true },
    });
    expect(mocks.ticketUpdateMany).not.toHaveBeenCalled();
    expect(mocks.activityCreateMany).not.toHaveBeenCalled();
  });

  it("updates and logs only the active organization", async () => {
    const result = await bulkUpdateTickets({
      organizationId: "org-1",
      ticketIds: ["ticket-1", "ticket-2"],
      action: { type: "change-priority", value: "urgent" },
    });

    expect(mocks.ticketUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["ticket-1", "ticket-2"] },
        organizationId: "org-1",
      },
      data: {
        organizationId: "org-1",
        priority: "urgent",
      },
    });
    expect(mocks.activityCreateMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "org-1",
          ticketId: "ticket-1",
          type: "bulk_change_priority",
          message: "Bulk priority changed to urgent",
        },
        {
          organizationId: "org-1",
          ticketId: "ticket-2",
          type: "bulk_change_priority",
          message: "Bulk priority changed to urgent",
        },
      ],
    });
    expect(result).toEqual({ updated: 2 });
  });

  it("requires an active organization membership for bulk assignment", async () => {
    mocks.userFindFirst.mockResolvedValueOnce({
      id: "user-2",
      name: "Agent",
      email: "agent@example.com",
    });
    mocks.organizationMemberFindUnique.mockResolvedValueOnce({
      status: "suspended",
    });

    await expect(
      bulkUpdateTickets({
        organizationId: "org-1",
        ticketIds: ["ticket-1", "ticket-2"],
        action: { type: "assign", value: "agent@example.com" },
      }),
    ).rejects.toThrow("Assignee is not an active organization member");

    expect(mocks.organizationMemberFindUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: "org-1",
          userId: "user-2",
        },
      },
      select: { status: true },
    });
    expect(mocks.ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("allows default-workspace bulk migration of legacy null tickets", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);

    await bulkUpdateTickets({
      organizationId: "org-default",
      ticketIds: ["ticket-1", "ticket-2"],
      action: { type: "change-status", value: "resolved" },
    });

    expect(mocks.ticketFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["ticket-1", "ticket-2"] },
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
      select: { id: true },
    });
    expect(mocks.ticketUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["ticket-1", "ticket-2"] },
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
      data: {
        organizationId: "org-default",
        status: "resolved",
      },
    });
  });
});
