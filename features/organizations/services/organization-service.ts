import { prisma } from "@/lib/prisma";

const LEGACY_ORGANIZATION_SLUG = "default-workspace";

export type OrganizationContext = {
  organizationId: string;
  role: string;
};

export async function ensureDefaultOrganization() {
  return prisma.organization.upsert({
    where: { slug: LEGACY_ORGANIZATION_SLUG },
    update: {},
    create: {
      name: "Default Workspace",
      slug: LEGACY_ORGANIZATION_SLUG,
    },
  });
}

/**
 * Keeps existing installations usable while organization onboarding is added.
 * Every legacy user is attached to one deterministic workspace on first login.
 */
export async function ensureLegacyOrganizationForUser(user: {
  id: string;
  role: string;
  defaultOrganizationId?: string | null;
}): Promise<OrganizationContext> {
  if (user.defaultOrganizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.defaultOrganizationId,
          userId: user.id,
        },
      },
    });

    if (membership?.status === "active") {
      return {
        organizationId: user.defaultOrganizationId,
        role: membership.role,
      };
    }
  }

  const organization = await ensureDefaultOrganization();
  const membership = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role: user.role,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: user.role,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultOrganizationId: organization.id },
  });

  return {
    organizationId: organization.id,
    role: membership.role,
  };
}

export async function requireOrganizationMembership(
  userId: string,
  organizationId: string,
): Promise<OrganizationContext | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  if (!membership || membership.status !== "active") return null;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization || organization.status !== "active") return null;

  return {
    organizationId,
    role: membership.role,
  };
}
