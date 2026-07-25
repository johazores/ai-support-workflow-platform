import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listUserOrganizations,
  selectUserOrganization,
} from "@/features/organizations/services/organization-selection-service";

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  membershipFindMany: vi.fn(),
  membershipFindUnique: vi.fn(),
  organizationFindMany: vi.fn(),
  organizationFindFirst: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    organizationMember: {
      findMany: mocks.membershipFindMany,
      findUnique: mocks.membershipFindUnique,
    },
    organization: {
      findMany: mocks.organizationFindMany,
      findFirst: mocks.organizationFindFirst,
    },
    auditEvent: {
      create: mocks.auditCreate,
    },
  },
}));

describe("organization selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindFirst.mockResolvedValue({ defaultOrganizationId: "org-1" });
    mocks.userUpdate.mockResolvedValue({});
    mocks.membershipFindMany.mockResolvedValue([]);
    mocks.membershipFindUnique.mockResolvedValue(null);
    mocks.organizationFindMany.mockResolvedValue([]);
    mocks.organizationFindFirst.mockResolvedValue(null);
    mocks.auditCreate.mockResolvedValue({});
  });

  it("lists only active organizations from active memberships", async () => {
    mocks.membershipFindMany.mockResolvedValueOnce([
      { organizationId: "org-1", role: "admin" },
      { organizationId: "org-2", role: "agent" },
    ]);
    mocks.organizationFindMany.mockResolvedValueOnce([
      { id: "org-1", name: "Primary", slug: "primary" },
    ]);

    await expect(listUserOrganizations("user-1")).resolves.toEqual([
      {
        id: "org-1",
        name: "Primary",
        slug: "primary",
        role: "admin",
        isCurrent: true,
      },
    ]);

    expect(mocks.membershipFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "active" },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true, role: true },
    });
    expect(mocks.organizationFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["org-1", "org-2"] },
        status: "active",
      },
      select: { id: true, name: true, slug: true },
    });
  });

  it("rejects selection without an active membership", async () => {
    mocks.membershipFindUnique.mockResolvedValueOnce({
      status: "inactive",
      role: "agent",
    });

    await expect(
      selectUserOrganization({ userId: "user-1", organizationId: "org-2" }),
    ).rejects.toThrow("Organization access denied");

    expect(mocks.organizationFindFirst).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("rejects selection when the organization itself is inactive", async () => {
    mocks.membershipFindUnique.mockResolvedValueOnce({
      status: "active",
      role: "agent",
    });
    mocks.organizationFindFirst.mockResolvedValueOnce(null);

    await expect(
      selectUserOrganization({ userId: "user-1", organizationId: "org-2" }),
    ).rejects.toThrow("Organization access denied");

    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("persists and audits a valid organization switch", async () => {
    mocks.membershipFindUnique.mockResolvedValueOnce({
      status: "active",
      role: "supervisor",
    });
    mocks.organizationFindFirst.mockResolvedValueOnce({
      id: "org-2",
      name: "Second Org",
      slug: "second-org",
    });

    await expect(
      selectUserOrganization({ userId: "user-1", organizationId: "org-2" }),
    ).resolves.toEqual({
      id: "org-2",
      name: "Second Org",
      slug: "second-org",
      role: "supervisor",
    });

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { defaultOrganizationId: "org-2" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-2",
        userId: "user-1",
        action: "organization.selected",
        targetId: "org-2",
        metadata: {
          previousOrganizationId: "org-1",
          role: "supervisor",
        },
      }),
    });
  });

  it("does not rewrite or audit when selecting the current organization", async () => {
    mocks.membershipFindUnique.mockResolvedValueOnce({
      status: "active",
      role: "admin",
    });
    mocks.organizationFindFirst.mockResolvedValueOnce({
      id: "org-1",
      name: "Primary",
      slug: "primary",
    });

    await selectUserOrganization({ userId: "user-1", organizationId: "org-1" });

    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
