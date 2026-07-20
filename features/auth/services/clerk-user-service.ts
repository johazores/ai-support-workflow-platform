import { prisma } from "@/lib/prisma";
import { ensureLegacyOrganizationForUser } from "@/features/organizations/services/organization-service";
import type { SessionUser } from "@/features/auth/services/session-service";

type ClerkIdentityInput = {
  clerkUserId: string;
  email: string;
  name: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function syncClerkIdentity(
  input: ClerkIdentityInput,
): Promise<SessionUser> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || email.split("@")[0] || "User";

  let user = await prisma.user.findUnique({
    where: { clerkUserId: input.clerkUserId },
  });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    user = existingByEmail
      ? await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkUserId: input.clerkUserId,
            email,
            name,
            status: "active",
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

  const organization = await ensureLegacyOrganizationForUser(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: organization.role,
    organizationId: organization.organizationId,
    authProvider: "clerk",
  };
}

export async function getInternalClerkUser(
  clerkUserId: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user || user.status !== "active") return null;

  const organization = await ensureLegacyOrganizationForUser(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: organization.role,
    organizationId: organization.organizationId,
    authProvider: "clerk",
  };
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
