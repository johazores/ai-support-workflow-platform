import { prisma } from "@/lib/prisma";

export type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isCurrent: boolean;
};

export async function listUserOrganizations(
  userId: string,
): Promise<OrganizationOption[]> {
  const user = await prisma.user.findFirst({
    where: { id: userId, status: "active" },
    select: { defaultOrganizationId: true },
  });
  if (!user) throw new Error("User not found");

  const memberships = await prisma.organizationMember.findMany({
    where: { userId, status: "active" },
    orderBy: { createdAt: "asc" },
    select: {
      organizationId: true,
      role: true,
    },
  });

  if (memberships.length === 0) return [];

  const organizations = await prisma.organization.findMany({
    where: {
      id: { in: memberships.map((membership) => membership.organizationId) },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );

  return memberships.flatMap((membership) => {
    const organization = organizationsById.get(membership.organizationId);
    if (!organization) return [];

    return [
      {
        ...organization,
        role: membership.role,
        isCurrent: organization.id === user.defaultOrganizationId,
      },
    ];
  });
}

export async function selectUserOrganization(input: {
  userId: string;
  organizationId: string;
}) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: {
      status: true,
      role: true,
    },
  });
  if (membership?.status !== "active") {
    throw new Error("Organization access denied");
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: input.organizationId,
      status: "active",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  if (!organization) throw new Error("Organization access denied");

  const currentUser = await prisma.user.findFirst({
    where: { id: input.userId, status: "active" },
    select: { defaultOrganizationId: true },
  });
  if (!currentUser) throw new Error("User not found");

  if (currentUser.defaultOrganizationId !== organization.id) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { defaultOrganizationId: organization.id },
    });

    try {
      await prisma.auditEvent.create({
        data: {
          organizationId: organization.id,
          userId: input.userId,
          actorType: "user",
          action: "organization.selected",
          targetType: "organization",
          targetId: organization.id,
          metadata: {
            previousOrganizationId: currentUser.defaultOrganizationId,
            role: membership.role,
          },
        },
      });
    } catch (error) {
      console.error("Failed to record organization selection audit event", error);
    }
  }

  return {
    ...organization,
    role: membership.role,
  };
}
