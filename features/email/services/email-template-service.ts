import { prisma } from "@/lib/prisma";

export async function listEmailTemplates() {
  return prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function createEmailTemplate(data: {
  name: string;
  subject: string;
  body: string;
}) {
  return prisma.emailTemplate.create({ data });
}

export async function updateEmailTemplate(
  id: string,
  data: { name?: string; subject?: string; body?: string },
) {
  return prisma.emailTemplate.update({ where: { id }, data });
}

export async function deleteEmailTemplate(id: string) {
  return prisma.emailTemplate.delete({ where: { id } });
}
