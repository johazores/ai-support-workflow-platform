import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { seedSlaPolicies } from "@/features/sla/services/sla-service";
import { prisma } from "@/lib/prisma";

function slugifyOrganizationName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "workspace";
}

async function createUniqueSlug(name: string) {
  const base = slugifyOrganizationName(name);

  for (let suffix = 0; suffix < 100; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("Unable to create a unique organization slug");
}

async function cleanupProvisioning(input: {
  userId: string;
  organizationId: string;
  previousRole: string;
}) {
  await Promise.allSettled([
    prisma.slaPolicy.deleteMany({
      where: { organizationId: input.organizationId },
    }),
    prisma.organizationMember.deleteMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    }),
    prisma.user.updateMany({
      where: {
        id: input.userId,
        defaultOrganizationId: input.organizationId,
      },
      data: {
        defaultOrganizationId: null,
        role: input.previousRole,
      },
    }),
  ]);

  await prisma.organization.deleteMany({
    where: { id: input.organizationId },
  });
}

export async function createFirstOrganization(input: {
  userId: string;
  name: string;
}) {
  const user = await prisma.user.findFirst({
    where: { id: input.userId, status: "active" },
  });
  if (!user) throw new Error("User not found");

  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, status: "active" },
    select: { organizationId: true },
  });
  if (existingMembership) {
    throw new Error("User already belongs to an organization");
  }

  if (user.defaultOrganizationId) {
    throw new Error("Organization onboarding is already in progress");
  }

  const slug = await createUniqueSlug(input.name);
  const organization = await prisma.organization.create({
    data: {
      name: input.name.trim(),
      slug,
      status: "active",
    },
  });

  const claim = await prisma.user.updateMany({
    where: {
      id: user.id,
      status: "active",
      defaultOrganizationId: null,
    },
    data: {
      defaultOrganizationId: organization.id,
      role: "admin",
    },
  });

  if (claim.count !== 1) {
    await prisma.organization.deleteMany({ where: { id: organization.id } });
    throw new Error("Organization onboarding is already in progress");
  }

  try {
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "admin",
        status: "active",
      },
    });

    await seedSlaPolicies(organization.id);
  } catch (error) {
    await cleanupProvisioning({
      userId: user.id,
      organizationId: organization.id,
      previousRole: user.role,
    });
    throw error;
  }

  try {
    await recordAuditEvent({
      actorType: "user",
      userId: user.id,
      organizationId: organization.id,
      action: "organization.created",
      targetType: "organization",
      targetId: organization.id,
      metadata: { name: organization.name, slug: organization.slug },
    });
  } catch (error) {
    console.error("Failed to record organization onboarding audit event", error);
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    role: "admin" as const,
  };
}
