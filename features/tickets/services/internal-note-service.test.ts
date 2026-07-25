import { beforeEach, describe, expect, it, vi } from "vitest";
import { addInternalNote } from "@/features/tickets/services/internal-note-service";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  ticketFindFirst: vi.fn(),
  messageCreate: vi.fn(),
  activityCreate: vi.fn(),
  broadcastTicketUpdate: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: { findFirst: mocks.ticketFindFirst },
    message: { create: mocks.messageCreate },
    activityLog: { create: mocks.activityCreate },
  },
}));

vi.mock("@/pages/api/tickets/[ticket-id]/events", () => ({
  broadcastTicketUpdate: mocks.broadcastTicketUpdate,
}));

describe("internal note tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
    mocks.messageCreate.mockResolvedValue({ id: "message-1" });
    mocks.activityCreate.mockResolvedValue({ id: "activity-1" });
  });

  it("does not allow a normal organization to target a null-owned ticket", async () => {
    await addInternalNote({
      organizationId: "org-1",
      ticketId: "ticket-1",
      body: "Private note",
    });

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-1" },
    });
  });

  it("allows controlled null-ticket migration only for the legacy workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValue(true);

    await addInternalNote({
      organizationId: "legacy-org",
      ticketId: "ticket-1",
      body: "Private note",
    });

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith({
      where: {
        id: "ticket-1",
        OR: [
          { organizationId: "legacy-org" },
          { organizationId: null },
        ],
      },
    });
  });
});
