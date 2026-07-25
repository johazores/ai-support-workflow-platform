import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCustomerWithTickets,
  listCustomers,
} from "@/features/customers/services/customer-service";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  customerFindMany: vi.fn(),
  customerFindFirst: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: mocks.customerFindMany,
      findFirst: mocks.customerFindFirst,
    },
  },
}));

describe("customer service tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.customerFindMany.mockResolvedValue([]);
    mocks.customerFindFirst.mockResolvedValue(null);
  });

  it("does not expose null-owned customers or tickets to normal organizations", async () => {
    await listCustomers("org-1");

    expect(mocks.customerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        include: {
          _count: {
            select: {
              tickets: { where: { organizationId: "org-1" } },
            },
          },
        },
      }),
    );
  });

  it("allows null-owned customer migration reads only for the legacy workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValue(true);

    await getCustomerWithTickets("legacy-org", "customer-1");

    expect(mocks.customerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "customer-1",
          OR: [
            { organizationId: "legacy-org" },
            { organizationId: null },
          ],
        },
        include: expect.objectContaining({
          tickets: expect.objectContaining({
            where: {
              OR: [
                { organizationId: "legacy-org" },
                { organizationId: null },
              ],
            },
          }),
        }),
      }),
    );
  });
});
