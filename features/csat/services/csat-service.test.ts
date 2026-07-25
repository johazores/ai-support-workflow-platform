import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCsatRating,
  getCsatStats,
  submitCsatRating,
} from "@/features/csat/services/csat-service";

const mocks = vi.hoisted(() => ({
  ticketFindFirst: vi.fn(),
  csatUpsert: vi.fn(),
  csatFindUnique: vi.fn(),
  csatFindMany: vi.fn(),
  isLegacyOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
    },
    csatRating: {
      upsert: mocks.csatUpsert,
      findUnique: mocks.csatFindUnique,
      findMany: mocks.csatFindMany,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

describe("CSAT tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
    mocks.csatUpsert.mockResolvedValue({ id: "rating-1" });
    mocks.csatFindUnique.mockResolvedValue(null);
    mocks.csatFindMany.mockResolvedValue([]);
  });

  it("rejects a ticket outside the active organization before reading CSAT", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce(null);

    await expect(getCsatRating("org-2", "ticket-1")).rejects.toThrow(
      "Ticket not found",
    );

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-2" },
      select: { id: true },
    });
    expect(mocks.csatFindUnique).not.toHaveBeenCalled();
  });

  it("writes the active organization when submitting a rating", async () => {
    await submitCsatRating("org-1", "ticket-1", 5, "Great support");

    expect(mocks.csatUpsert).toHaveBeenCalledWith({
      where: { ticketId: "ticket-1" },
      create: {
        organizationId: "org-1",
        ticketId: "ticket-1",
        score: 5,
        comment: "Great support",
      },
      update: {
        organizationId: "org-1",
        score: 5,
        comment: "Great support",
      },
    });
  });

  it("does not expose a rating already owned by another organization", async () => {
    mocks.csatFindUnique.mockResolvedValueOnce({
      id: "rating-1",
      organizationId: "org-2",
      ticketId: "ticket-1",
      score: 4,
      comment: null,
    });

    await expect(getCsatRating("org-1", "ticket-1")).resolves.toBeNull();
  });

  it("scopes stats to a normal organization", async () => {
    mocks.csatFindMany.mockResolvedValueOnce([
      { score: 5 },
      { score: 3 },
    ]);

    await expect(getCsatStats("org-1")).resolves.toEqual({
      average: 4,
      total: 2,
      distribution: { 3: 1, 5: 1 },
    });

    expect(mocks.csatFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
  });

  it("allows legacy null ratings only for the default workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);

    await getCsatStats("org-default");

    expect(mocks.csatFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
    });
  });
});
