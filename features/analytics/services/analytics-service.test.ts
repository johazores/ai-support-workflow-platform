import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnalytics } from "@/features/analytics/services/analytics-service";

const mocks = vi.hoisted(() => ({
  ticketCount: vi.fn(),
  ticketFindMany: vi.fn(),
  isLegacyOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      count: mocks.ticketCount,
      findMany: mocks.ticketFindMany,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

describe("analytics tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ticketCount.mockResolvedValue(0);
    mocks.ticketFindMany.mockResolvedValue([]);
  });

  it("scopes every aggregate to a normal organization", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(false);

    await getAnalytics("org-1", 7);

    expect(mocks.ticketCount).toHaveBeenNthCalledWith(1, {
      where: { organizationId: "org-1" },
    });
    expect(mocks.ticketCount).toHaveBeenNthCalledWith(2, {
      where: { organizationId: "org-1", status: "open" },
    });
    expect(mocks.ticketFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    );
    expect(mocks.ticketFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
    expect(mocks.ticketFindMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    );
  });

  it("includes legacy null tickets only for the default workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);

    await getAnalytics("org-default", 7);

    expect(mocks.ticketCount).toHaveBeenNthCalledWith(1, {
      where: {
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
    });
    expect(mocks.ticketCount).toHaveBeenNthCalledWith(2, {
      where: {
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
        status: "open",
      },
    });
  });
});
