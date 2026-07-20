import { prisma } from "@/lib/prisma";

export async function listOrganizationsForRoot() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    organizations.map(async (organization) => {
      const [members, tickets, workflows] = await Promise.all([
        prisma.organizationMember.count({
          where: { organizationId: organization.id, status: "active" },
        }),
        prisma.ticket.count({ where: { organizationId: organization.id } }),
        prisma.workflow.count({ where: { organizationId: organization.id } }),
      ]);

      return { ...organization, members, tickets, workflows };
    }),
  );
}

export async function updateOrganizationStatus(
  organizationId: string,
  status: "active" | "suspended",
) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { status },
  });
}
