import { prisma } from "@/lib/prisma";

export async function getEmailConfig() {
  return prisma.emailConfig.findFirst({ orderBy: { updatedAt: "desc" } });
}

export async function upsertEmailConfig(data: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
  fromAddress: string;
  fromName: string;
  isActive: boolean;
}) {
  const existing = await prisma.emailConfig.findFirst();

  if (existing) {
    return prisma.emailConfig.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.emailConfig.create({ data });
}
