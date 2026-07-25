import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirstOrganization } from "@/features/organizations/services/organization-onboarding-service";

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipCreate: vi.fn(),
  membershipDeleteMany: vi.fn(),
  organizationFindUnique: vi.fn(),
  organizationCreate: vi.fn(),
  organizationDelete: vi.fn(),
  slaDeleteMany: vi.fn(),
  seedSlaPolicies: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    organizationMember: {
      findFirst: mocks.membershipFindFirst,
      create: mocks.membershipCreate,
      deleteMany: mocks.membershipDeleteMany,
    },
    organization: {
      findUnique: mocks.organizationFindUnique,
      create: mocks.organizationCreate,
      delete: mocks.organizationDelete,
    },
    slaPolicy: {
      deleteMany: mocks.slaDeleteMany,
    },
  },
}));

vi.mock("@/features/sla/services/sla-service", () => ({
  seedSlaPolicies: mocks.seedSlaPolicies,
}));

vi.mock("@/features/audit/services/audit-event-service", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

const user = {
  id: "user-1",
  name: "Owner",
  email: "owner@example.com",
  passwordHash: null,
  clerkUserId: "clerk-1",
  defaultOrganizationId: null,
  role: "agent",
  status: "active",
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const organization = {
  id: "org-1",
  name: "Acme Support",
  slug: "acme-support",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("first organization onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindFirst.mockResolvedValue(user);
    mocks.membershipFindFirst.mockResolvedValue(null);
    mocks.organizationFindUnique.mockResolvedValue(null);
    mocks.organizationCreate.mockResolvedValue(organization);
    mocks.membershipCreate.mockResolvedValue({ id: "membership-1" });
    mocks.userUpdate.mockResolvedValue({ ...user, defaultOrganizationId: "org-1" });
    mocks.seedSlaPolicies.mockResolvedValue(undefined);
    mocks.recordAuditEvent.mockResolvedValue({});
    mocks.slaDeleteMany.mockResolvedValue({ count: 0 });
    mocks.membershipDeleteMany.mockResolvedValue({ count: 0 });
    mocks.organizationDelete.mockResolvedValue(organization);
  });

  it("creates an admin membership, selects the organization, seeds SLA, and audits", async () => {
    const result = await createFirstOrganization({
      userId: "user-1",
      name: "Acme Support",
    });

    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: {
        name: "Acme Support",
        slug: "acme-support",
        status: "active",
      },
    });
    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "user-1",
        role: "admin",
        status: "active",
      },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        defaultOrganizationId: "org-1",
        role: "admin",
      },
    });
    expect(mocks.seedSlaPolicies).toHaveBeenCalledWith("org-1");
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "user",
        userId: "user-1",
        organizationId: "org-1",
        action: "organization.created",
        targetId: "org-1",
      }),
    );
    expect(result).toEqual({
      id: "org-1",
      name: "Acme Support",
      slug: "acme-support",
      role: "admin",
    });
  });

  it("rejects repeat onboarding when an active membership already exists", async () => {
    mocks.membershipFindFirst.mockResolvedValueOnce({ organizationId: "org-existing" });

    await expect(
      createFirstOrganization({ userId: "user-1", name: "Another Org" }),
    ).rejects.toThrow("User already belongs to an organization");

    expect(mocks.organizationCreate).not.toHaveBeenCalled();
  });

  it("uses a deterministic suffix when the base slug already exists", async () => {
    mocks.organizationFindUnique
      .mockResolvedValueOnce({ id: "taken" })
      .mockResolvedValueOnce(null);
    mocks.organizationCreate.mockResolvedValueOnce({
      ...organization,
      slug: "acme-support-2",
    });

    await createFirstOrganization({ userId: "user-1", name: "Acme Support" });

    expect(mocks.organizationFindUnique).toHaveBeenNthCalledWith(1, {
      where: { slug: "acme-support" },
      select: { id: true },
    });
    expect(mocks.organizationFindUnique).toHaveBeenNthCalledWith(2, {
      where: { slug: "acme-support-2" },
      select: { id: true },
    });
  });

  it("compensates organization state when provisioning fails", async () => {
    mocks.seedSlaPolicies.mockRejectedValueOnce(new Error("seed failed"));

    await expect(
      createFirstOrganization({ userId: "user-1", name: "Acme Support" }),
    ).rejects.toThrow("seed failed");

    expect(mocks.slaDeleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
    expect(mocks.membershipDeleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", userId: "user-1" },
    });
    expect(mocks.userUpdate).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: { defaultOrganizationId: null, role: "agent" },
    });
    expect(mocks.organizationDelete).toHaveBeenCalledWith({
      where: { id: "org-1" },
    });
  });
});
