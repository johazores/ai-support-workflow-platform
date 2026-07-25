import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveDraft } from "@/features/ai-drafts/services/draft-service";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  ticketFindFirst: vi.fn(),
  draftCreate: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: { findFirst: mocks.ticketFindFirst },
    draft: { create: mocks.draftCreate },
  },
}));

describe("saveDraft tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
    mocks.draftCreate.mockResolvedValue({ id: "draft-1" });
  });

  it("does not allow a normal organization to target a null-owned ticket", async () => {
    await saveDraft({
      organizationId: "org-1",
      ticketId: "ticket-1",
      body: "Draft",
    });

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-1" },
    });
  });

  it("allows controlled null-ticket migration only for the legacy workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValue(true);

    await saveDraft({
      organizationId: "legacy-org",
      ticketId: "ticket-1",
      body: "Draft",
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
