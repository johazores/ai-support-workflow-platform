import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptPendingOrganizationInvitations,
  createOrganizationInvitation,
  revokeOrganizationInvitation,
} from "@/features/organizations/services/organization-invitation-service";

const mocks = vi.hoisted(() => ({
  organizationInvitationUpdateMany: vi.fn(),
  organizationInvitationFindMany: vi.fn(),
  organizationInvitationFindFirst: vi.fn(),
  organizationInvitationCreate: vi.fn(),
  organizationInvitationUpdate: vi.fn(),
  organizationFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipCreate: vi.fn(),
  membershipUpdate: vi.fn(),
  clerkCreateInvitation: vi.fn(),
  clerkRevokeInvitation: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationInvitation: {
      updateMany: mocks.organizationInvitationUpdateMany,
      findMany: mocks.organizationInvitationFindMany,
      findFirst: mocks.organizationInvitationFindFirst,
      create: mocks.organizationInvitationCreate,
      update: mocks.organizationInvitationUpdate,
    },
    organization: {
      findFirst: mocks.organizationFindFirst,
    },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      updateMany: mocks.userUpdateMany,
    },
    organizationMember: {
      findUnique: mocks.membershipFindUnique,
      create: mocks.membershipCreate,
      update: mocks.membershipUpdate,
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    invitations: {
      createInvitation: mocks.clerkCreateInvitation,
      revokeInvitation: mocks.clerkRevokeInvitation,
    },
  })),
}));

vi.mock("@/features/audit/services/audit-event-service", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

const organization = { id: "org-1", name: "Acme Support" };
const pendingInvitation = {
  id: "invite-1",
  organizationId: "org-1",
  email: "member@example.com",
  role: "agent",
  status: "pending",
  clerkInvitationId: "clerk-invite-1",
  invitedByUserId: "admin-1",
  acceptedByUserId: null,
  expiresAt: new Date(Date.now() + 86_400_000),
  acceptedAt: null,
  revokedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("organization invitation lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.organizationInvitationUpdateMany.mockResolvedValue({ count: 0 });
    mocks.organizationInvitationFindMany.mockResolvedValue([]);
    mocks.organizationInvitationFindFirst.mockResolvedValue(null);
    mocks.organizationInvitationCreate.mockResolvedValue(pendingInvitation);
    mocks.organizationInvitationUpdate.mockResolvedValue(pendingInvitation);
    mocks.organizationFindFirst.mockResolvedValue(organization);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({});
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
    mocks.membershipFindUnique.mockResolvedValue(null);
    mocks.membershipCreate.mockResolvedValue({ id: "membership-1" });
    mocks.membershipUpdate.mockResolvedValue({});
    mocks.clerkCreateInvitation.mockResolvedValue({ id: "clerk-invite-1" });
    mocks.clerkRevokeInvitation.mockResolvedValue({});
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("sends a Clerk invitation and stores the tenant-owned pending record", async () => {
    const result = await createOrganizationInvitation({
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      email: "Member@Example.com",
      role: "agent",
    });

    expect(mocks.clerkCreateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "member@example.com",
        expiresInDays: 7,
        ignoreExisting: true,
        notify: true,
        publicMetadata: {
          organizationId: "org-1",
          organizationRole: "agent",
        },
      }),
    );
    expect(mocks.organizationInvitationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        email: "member@example.com",
        role: "agent",
        status: "pending",
        clerkInvitationId: "clerk-invite-1",
        invitedByUserId: "admin-1",
      }),
    });
    expect(result.delivery).toBe("email");
  });

  it("does not send another invitation while an unexpired one is pending", async () => {
    mocks.organizationInvitationFindFirst.mockResolvedValueOnce(
      pendingInvitation,
    );

    await expect(
      createOrganizationInvitation({
        organizationId: "org-1",
        invitedByUserId: "admin-1",
        email: "member@example.com",
        role: "agent",
      }),
    ).rejects.toThrow("Invitation already pending");

    expect(mocks.clerkCreateInvitation).not.toHaveBeenCalled();
  });

  it("adds an existing active Clerk identity directly without sending email", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user-2",
      email: "member@example.com",
      status: "active",
      clerkUserId: "clerk-user-2",
      defaultOrganizationId: null,
    });
    mocks.organizationInvitationCreate.mockResolvedValueOnce({
      ...pendingInvitation,
      status: "accepted",
      clerkInvitationId: null,
      acceptedByUserId: "user-2",
      acceptedAt: new Date(),
    });

    const result = await createOrganizationInvitation({
      organizationId: "org-1",
      invitedByUserId: "admin-1",
      email: "member@example.com",
      role: "supervisor",
    });

    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "user-2",
        role: "supervisor",
        status: "active",
      },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { defaultOrganizationId: "org-1" },
    });
    expect(mocks.clerkCreateInvitation).not.toHaveBeenCalled();
    expect(result.delivery).toBe("member-added");
  });

  it("revokes only a pending invitation owned by the requested organization", async () => {
    mocks.organizationInvitationFindFirst.mockResolvedValueOnce(null);

    await expect(
      revokeOrganizationInvitation({
        organizationId: "org-2",
        invitationId: "invite-1",
        actorUserId: "admin-2",
      }),
    ).rejects.toThrow("Invitation not found");

    expect(mocks.clerkRevokeInvitation).not.toHaveBeenCalled();
  });

  it("accepts a pending invite by verified internal email and creates membership", async () => {
    mocks.organizationInvitationFindMany.mockResolvedValueOnce([
      pendingInvitation,
    ]);

    const result = await acceptPendingOrganizationInvitations({
      userId: "user-2",
      email: "MEMBER@example.com",
    });

    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "user-2",
        role: "agent",
        status: "active",
      },
    });
    expect(mocks.organizationInvitationUpdate).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: expect.objectContaining({
        status: "accepted",
        acceptedByUserId: "user-2",
        acceptedAt: expect.any(Date),
      }),
    });
    expect(mocks.userUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-2", defaultOrganizationId: null },
      data: { defaultOrganizationId: "org-1" },
    });
    expect(result).toEqual(["org-1"]);
  });

  it("revokes an internal invitation when its organization is no longer active", async () => {
    mocks.organizationInvitationFindMany.mockResolvedValueOnce([
      pendingInvitation,
    ]);
    mocks.organizationFindFirst.mockResolvedValueOnce(null);

    const result = await acceptPendingOrganizationInvitations({
      userId: "user-2",
      email: "member@example.com",
    });

    expect(mocks.organizationInvitationUpdate).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "revoked", revokedAt: expect.any(Date) },
    });
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("revokes the Clerk invitation if internal persistence fails", async () => {
    mocks.organizationInvitationCreate.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(
      createOrganizationInvitation({
        organizationId: "org-1",
        invitedByUserId: "admin-1",
        email: "member@example.com",
        role: "agent",
      }),
    ).rejects.toThrow("database unavailable");

    expect(mocks.clerkRevokeInvitation).toHaveBeenCalledWith(
      "clerk-invite-1",
    );
  });
});
