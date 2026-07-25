import { getAllTags } from "@/features/tags/services/tag-service";
import { prisma } from "@/lib/prisma";

export async function getWorkflowEditorOptions(organizationId: string) {
  const [memberships, tags] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId, status: "active" },
      orderBy: { createdAt: "asc" },
      select: { userId: true, role: true },
    }),
    getAllTags(organizationId),
  ]);

  const users = await prisma.user.findMany({
    where: {
      id: { in: memberships.map((membership) => membership.userId) },
      status: "active",
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const roleByUserId = new Map(
    memberships.map((membership) => [membership.userId, membership.role]),
  );

  return {
    users: users.map((user) => ({
      ...user,
      role: roleByUserId.get(user.id) ?? "agent",
    })),
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
  };
}
