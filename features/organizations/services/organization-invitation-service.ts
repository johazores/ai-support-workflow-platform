import { clerkClient } from "@clerk/nextjs/server";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { prisma } from "@/lib/prisma";

const INVITATION_EXPIRY_DAYS = 7;
const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

type OrganizationRole = "admin" | "supervisor" | "agent";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getInvitationRedirectUrl() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (!appUrl) return undefined;
  return `${appUrl.replace(/\/$/, "")}/sign-up`;
}

async function expirePendingInvitations(organizationId?: string) {
  return prisma.organizationInvitation.updateMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: "pending",
      expiresAt: { lte: new Date() },
    },
    data: { status: "expired" },
  });
}

async function assertOrganizationActive(organizationId: string) {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, status: "active" },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error("Organization not found");
  return organization;
}

async function recordInvitationAudit(input: {
  organizationId: string;
  actorUserId?: string;
  action: string;
  invitationId: string;
  metadata?: Record<string, string | boolean>;
}) {
  try {
    await recordAuditEvent({
      actorType: "user",
      userId: input.actorUserId,
      organizationId: input.organizationId,
      action: input.action,
      targetType: "organization-invitation",
      targetId: input.invitationId,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("Failed to record organization invitation audit event", error);
  }
}

export async function listOrganizationInvitations(organizationId: string) {
  await expirePendingInvitations(organizationId);

  return prisma.organizationInvitation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createOrganizationInvitation(input: {
  organizationId: string;
  invitedByUserId: string;
  email: string;
  role: OrganizationRole;
}) {
  const organization = await assertOrganizationActive(input.organizationId);
  const email = normalizeEmail(input.email);

  await expirePendingInvitations(input.organizationId);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser?.status === "active") {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: existingUser.id,
        },
      },
    });

    if (membership?.status === "active") {
      throw new Error("User already belongs to organization");
    }

    if (existingUser.clerkUserId) {
      if (membership) {
        await prisma.organizationMember.update({
          where: { id: membership.id },
          data: { status: "active", role: input.role },
        });
      } else {
        await prisma.organizationMember.create({
          data: {
            organizationId: input.organizationId,
            userId: existingUser.id,
            role: input.role,
            status: "active",
          },
        });
      }

      if (!existingUser.defaultOrganizationId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { defaultOrganizationId: input.organizationId },
        });
      }

      const acceptedAt = new Date();
      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId: input.organizationId,
          email,
          role: input.role,
          status: "accepted",
          invitedByUserId: input.invitedByUserId,
          acceptedByUserId: existingUser.id,
          acceptedAt,
          expiresAt: acceptedAt,
        },
      });

      await recordInvitationAudit({
        organizationId: input.organizationId,
        actorUserId: input.invitedByUserId,
        action: "organization.invitation.member_added",
        invitationId: invitation.id,
        metadata: {
          email,
          role: input.role,
          organizationName: organization.name,
        },
      });

      return { invitation, delivery: "member-added" as const };
    }
  }

  const pending = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) throw new Error("Invitation already pending");

  const client = await clerkClient();
  const redirectUrl = getInvitationRedirectUrl();
  const clerkInvitation = await client.invitations.createInvitation({
    emailAddress: email,
    expiresInDays: INVITATION_EXPIRY_DAYS,
    ignoreExisting: true,
    notify: true,
    publicMetadata: {
      organizationId: input.organizationId,
      organizationRole: input.role,
    },
    ...(redirectUrl ? { redirectUrl } : {}),
  });

  try {
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: input.organizationId,
        email,
        role: input.role,
        status: "pending",
        clerkInvitationId: clerkInvitation.id,
        invitedByUserId: input.invitedByUserId,
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
      },
    });

    await recordInvitationAudit({
      organizationId: input.organizationId,
      actorUserId: input.invitedByUserId,
      action: "organization.invitation.sent",
      invitationId: invitation.id,
      metadata: {
        email,
        role: input.role,
        organizationName: organization.name,
      },
    });

    return { invitation, delivery: "email" as const };
  } catch (error) {
    try {
      await client.invitations.revokeInvitation(clerkInvitation.id);
    } catch (revokeError) {
      console.error("Failed to revoke orphaned Clerk invitation", revokeError);
    }
    throw error;
  }
}

export async function revokeOrganizationInvitation(input: {
  organizationId: string;
  invitationId: string;
  actorUserId: string;
}) {
  await expirePendingInvitations(input.organizationId);

  const invitation = await prisma.organizationInvitation.findFirst({
    where: {
      id: input.invitationId,
      organizationId: input.organizationId,
      status: "pending",
    },
  });
  if (!invitation) throw new Error("Invitation not found");

  if (invitation.clerkInvitationId) {
    const client = await clerkClient();
    await client.invitations.revokeInvitation(invitation.clerkInvitationId);
  }

  const revoked = await prisma.organizationInvitation.update({
    where: { id: invitation.id },
    data: { status: "revoked", revokedAt: new Date() },
  });

  await recordInvitationAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "organization.invitation.revoked",
    invitationId: invitation.id,
    metadata: { email: invitation.email, role: invitation.role },
  });

  return revoked;
}

export async function acceptPendingOrganizationInvitations(input: {
  userId: string;
  email: string;
}) {
  const email = normalizeEmail(input.email);
  await expirePendingInvitations();

  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      email,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
  });

  const acceptedOrganizationIds: string[] = [];

  for (const invitation of invitations) {
    const organization = await prisma.organization.findFirst({
      where: { id: invitation.organizationId, status: "active" },
      select: { id: true },
    });

    if (!organization) {
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "revoked", revokedAt: new Date() },
      });
      continue;
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: input.userId,
        },
      },
    });

    if (!membership) {
      await prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: input.userId,
          role: invitation.role,
          status: "active",
        },
      });
    } else if (membership.status !== "active") {
      await prisma.organizationMember.update({
        where: { id: membership.id },
        data: { status: "active", role: invitation.role },
      });
    }

    const acceptedAt = new Date();
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "accepted",
        acceptedByUserId: input.userId,
        acceptedAt,
      },
    });

    await recordInvitationAudit({
      organizationId: invitation.organizationId,
      actorUserId: input.userId,
      action: "organization.invitation.accepted",
      invitationId: invitation.id,
      metadata: { email, role: invitation.role },
    });

    acceptedOrganizationIds.push(invitation.organizationId);
  }

  if (acceptedOrganizationIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: input.userId, defaultOrganizationId: null },
      data: { defaultOrganizationId: acceptedOrganizationIds[0] },
    });
  }

  return acceptedOrganizationIds;
}
