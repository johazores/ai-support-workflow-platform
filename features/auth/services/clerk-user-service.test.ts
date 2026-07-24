import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getInternalClerkUser,
  syncClerkIdentity,
} from "@/features/auth/services/clerk-user-service";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  membershipFindMany: vi.fn(),
  requireMembership: vi.fn(),
  ensureLegacy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    organizationMember: {
      findMany: mocks.membershipFindMany,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  requireOrganizationMembership: mocks.requireMembership,
  ensureLegacyOrganizationForUser: mocks.ensureLegacy,
}));

const baseUser = {
  id: "user-1",
  name: "New User",
  email: "new@example.com",
  passwordHash: null,
  clerkUserId: "clerk-1",
  defaultOrganizationId: null,
  role: "agent",
  status: "active",
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("Clerk identity organization resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membershipFindMany.mockResolvedValue([]);
    mocks.requireMembership.mockResolvedValue(null);
    mocks.ensureLegacy.mockResolvedValue({
      organizationId: "org-default",
      role: "agent",
    });
    mocks.userUpdate.mockImplementation(async ({ data }: { data: object }) => ({
      ...baseUser,
      ...data,
    }));
  });

  it("keeps a brand-new Clerk-only identity organization-less", async () => {
    mocks.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mocks.userCreate.mockResolvedValueOnce(baseUser);

    const user = await syncClerkIdentity({
      clerkUserId: "clerk-1",
      email: "NEW@example.com",
      name: "New User",
    });

    expect(user).toEqual({
      id: "user-1",
      name: "New User",
      email: "new@example.com",
      role: "agent",
      organizationId: undefined,
      authProvider: "clerk",
    });
    expect(mocks.ensureLegacy).not.toHaveBeenCalled();
  });

  it("keeps password-backed users on the legacy migration path", async () => {
    const legacyUser = {
      ...baseUser,
      passwordHash: "hash",
      clerkUserId: "clerk-legacy",
    };
    mocks.userFindUnique.mockResolvedValueOnce(legacyUser);

    const user = await getInternalClerkUser("clerk-legacy");

    expect(mocks.ensureLegacy).toHaveBeenCalledWith(legacyUser);
    expect(user?.organizationId).toBe("org-default");
  });

  it("uses an active default membership before any migration fallback", async () => {
    const userWithDefault = {
      ...baseUser,
      defaultOrganizationId: "org-1",
    };
    mocks.userFindUnique.mockResolvedValueOnce(userWithDefault);
    mocks.requireMembership.mockResolvedValueOnce({
      organizationId: "org-1",
      role: "supervisor",
    });

    const user = await getInternalClerkUser("clerk-1");

    expect(mocks.requireMembership).toHaveBeenCalledWith("user-1", "org-1");
    expect(user).toEqual(
      expect.objectContaining({
        organizationId: "org-1",
        role: "supervisor",
      }),
    );
    expect(mocks.ensureLegacy).not.toHaveBeenCalled();
  });

  it("repairs the default organization from another active membership", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(baseUser);
    mocks.membershipFindMany.mockResolvedValueOnce([
      { organizationId: "org-2" },
    ]);
    mocks.requireMembership.mockResolvedValueOnce({
      organizationId: "org-2",
      role: "admin",
    });

    const user = await getInternalClerkUser("clerk-1");

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { defaultOrganizationId: "org-2" },
    });
    expect(user?.organizationId).toBe("org-2");
  });
});
