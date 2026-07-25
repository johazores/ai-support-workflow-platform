import type { User } from "@prisma/client";
import type { SessionUser } from "@/features/auth/services/session-service";
import { acceptPendingOrganizationInvitations } from "@/features/organizations/services/organization-invitation-service";
import {
  ensureLegacyOrganizationForUser,
  requireOrganizationMembership,
} from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

type ClerkIdentityInput = {
  clerkUserId: string;
  email: string;
  name: string;
};

export class InactiveProductUserError extends Error {
  constructor() {
    super("User account is inactive");
    this.name = "InactiveProductUserError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function resolveOrganization(user: User) {
  if (user.defaultOrganizationId) {
    const current = await requireOrganizationMembership(
      user.id,
      user.defaultOrganizationId,
    );
    if (current) return current;
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });

  for (const membership of memberships) {
    const organization = await requireOrganizationMembership(
      user.id,
      membership.organizationId,
    );
    if (!organization) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultOrganizationId: organization.organizationId },
    });
    return organization;
  }

  if (user.passwordHash) {
    return ensureLegacyOrganizationForUser(user);
  }

  if (user.defaultOrganizationId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { defaultOrganizationId: null },
    });
  }

  return null;
}

function toSessionUser(
  user: User,
  organization: Awaited<ReturnType<typeof resolveOrganization>>,
): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: organization?.role ?? user.role,
    organizationId: organization?.organizationId,
    authProvider: "clerk",
  };
}

export async function syncClerkIdentity(
  input: ClerkIdentityInput,
): Promise<SessionUser> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || email.split("@")[0] || "User";

  let user = await prisma.user.findUnique({
    where: { clerkUserId: input.clerkUserId },
  });

  if (user && user.status !== "active") {
    throw new InactiveProductUserError();
  }

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    if (existingByEmail && existingByEmail.status !== "active") {
      throw new InactiveProductUserError();
    }

    user = existingByEmail
      ? await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkUserId: input.clerkUserId,
            email,
            name,
          },
        })
      : await prisma.user.create({
          data: {
            clerkUserId: input.clerkUserId,
            email,
            name,
            passwordHash: null,
            role: "agent",
            status: "active",
          },
        });
  } else if (user.email !== email || user.name !== name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { email, name },
    });
  }

  await acceptPendingOrganizationInvitations({
    userId: user.id,
    email,
  });

  const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!refreshedUser) throw new Error("User disappeared during Clerk sync");
  if (refreshedUser.status !== "active") {
    throw new InactiveProductUserError();
  }

  const organization = await resolveOrganization(refreshedUser);
  return toSessionUser(refreshedUser, organization);
}

export async function getInternalClerkUser(
  clerkUserId: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user || user.status !== "active") return null;

  const organization = await resolveOrganization(user);
  return toSessionUser(user, organization);
}

export async function isInternalClerkUserInactive(clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { status: true },
  });
  return user?.status === "inactive";
}

export async function disableClerkUser(clerkUserId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) return null;

  await prisma.organizationMember.updateMany({
    where: { userId: user.id },
    data: { status: "inactive" },
  });

  return prisma.user.update({
    where: { id: user.id },
    data: { status: "inactive" },
  });
}
