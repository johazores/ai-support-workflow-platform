import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getUserById,
  listUsers,
  removeUserFromOrganization,
  updateUserRole,
} from "@/features/auth/services/user-management-service";

const mocks = vi.hoisted(() => ({
  organizationMemberFindMany: vi.fn(),
  organizationMemberFindUnique: vi.fn(),
  organizationMemberFindFirst: vi.fn(),
  organizationMemberUpdate: vi.fn(),
  organizationMemberCount: vi.fn(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  auditCreate: vi.fn(),
  isLegacyOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findMany: mocks.organizationMemberFindMany,
      findUnique: mocks.organizationMemberFindUnique,
      findFirst: mocks.organizationMemberFindFirst,
      update: mocks.organizationMemberUpdate,
      count: mocks.organizationMemberCount,
    },
    user: {
      findMany: mocks.userFindMany,
      findFirst: mocks.userFindFirst,
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    auditEvent: {
      create: mocks.auditCreate,
    },
  },
}));

vi.mock("@/features/auth/services/password-service", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

describe("user management tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.organizationMemberFindMany.mockResolvedValue([]);
    mocks.organizationMemberFindUnique.mockResolvedValue(null);
    mocks.organizationMemberFindFirst.mockResolvedValue(null);
    mocks.organizationMemberUpdate.mockResolvedValue({});
    mocks.organizationMemberCount.mockResolvedValue(2);
    mocks.userFindMany.mockResolvedValue([]);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
    mocks.isLegacyOrganization.mockResolvedValue(false);
  });

  it("lists only active members of the requested organization", async () => {
    mocks.organizationMemberFindMany.mockResolvedValueOnce([
      { userId: "user-1", role: "admin" },
      { userId: "user-2", role: "agent" },
    ]);
    mocks.userFindMany.mockResolvedValueOnce([
      {
        id: "user-1",
        name: "Admin",
        email: "admin@example.com",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: "user-2",
        name: "Agent",
        email: "agent@example.com",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    ]);

    const users = await listUsers("org-1");

    expect(mocks.organizationMemberFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", status: "active" },
      orderBy: { createdAt: "desc" },
      select: { userId: true, role: true },
    });
    expect(users.map((user) => user.role)).toEqual(["admin", "agent"]);
  });

  it("does not return a global user without an active tenant membership", async () => {
    mocks.organizationMemberFindUnique.mockResolvedValueOnce({
      id: "membership-1",
      status: "inactive",
      role: "agent",
    });

    await expect(getUserById("org-1", "user-2")).resolves.toBeNull();
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
  });

  it("blocks demoting the last active organization admin", async () => {
    mocks.organizationMemberFindUnique.mockResolvedValueOnce({
      id: "membership-1",
      status: "active",
      role: "admin",
    });
    mocks.organizationMemberCount.mockResolvedValueOnce(1);

    await expect(
      updateUserRole({
        organizationId: "org-1",
        actorUserId: "actor-1",
        id: "user-1",
        role: "supervisor",
      }),
    ).rejects.toThrow("Organization must keep at least one active admin");

    expect(mocks.organizationMemberUpdate).not.toHaveBeenCalled();
  });

  it("updates the tenant membership role without changing the global role", async () => {
    mocks.organizationMemberFindUnique
      .mockResolvedValueOnce({
        id: "membership-2",
        status: "active",
        role: "agent",
      })
      .mockResolvedValueOnce({
        id: "membership-2",
        status: "active",
        role: "supervisor",
      });
    mocks.userFindFirst.mockResolvedValueOnce({
      id: "user-2",
      name: "Agent",
      email: "agent@example.com",
      createdAt: new Date("2026-01-02T00:00:00Z"),
    });

    const user = await updateUserRole({
      organizationId: "org-1",
      actorUserId: "actor-1",
      id: "user-2",
      role: "supervisor",
    });

    expect(mocks.organizationMemberUpdate).toHaveBeenCalledWith({
      where: { id: "membership-2" },
      data: { role: "supervisor" },
    });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(user.role).toBe("supervisor");
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        userId: "actor-1",
        action: "organization.user.role_updated",
        targetId: "user-2",
      }),
    });
  });

  it("removes membership without deleting a shared global user", async () => {
    mocks.organizationMemberFindUnique.mockResolvedValueOnce({
      id: "membership-2",
      status: "active",
      role: "agent",
    });
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user-2",
      defaultOrganizationId: "org-2",
    });

    await removeUserFromOrganization({
      organizationId: "org-1",
      actorUserId: "actor-1",
      id: "user-2",
    });

    expect(mocks.organizationMemberUpdate).toHaveBeenCalledWith({
      where: { id: "membership-2" },
      data: { status: "inactive" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "organization.user.removed",
        targetId: "user-2",
      }),
    });
  });
});
