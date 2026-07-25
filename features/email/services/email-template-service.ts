import { prisma } from "@/lib/prisma";

export async function listEmailTemplates(organizationId: string) {
  return prisma.emailTemplate.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createEmailTemplate(data: {
  organizationId: string;
  name: string;
  subject: string;
  body: string;
}) {
  return prisma.emailTemplate.create({ data });
}

export async function updateEmailTemplate(
  organizationId: string,
  id: string,
  data: { name?: string; subject?: string; body?: string },
) {
  const existing = await prisma.emailTemplate.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Email template not found");

  return prisma.emailTemplate.update({ where: { id }, data });
}

export async function deleteEmailTemplate(
  organizationId: string,
  id: string,
) {
  const existing = await prisma.emailTemplate.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Email template not found");

  return prisma.emailTemplate.delete({ where: { id } });
}
