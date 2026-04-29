import { prisma } from "@/lib/prisma";

/** Get a specific mailbox config by ID. */
export async function getEmailConfigById(id: string) {
  return prisma.emailConfig.findUnique({ where: { id } });
}

/** Get the default mailbox config (backward-compatible). */
export async function getEmailConfig() {
  return (
    (await prisma.emailConfig.findFirst({
      where: { isDefault: true, isActive: true },
    })) ??
    (await prisma.emailConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }))
  );
}

/** List all configured mailboxes. */
export async function listEmailConfigs() {
  return prisma.emailConfig.findMany({ orderBy: { createdAt: "asc" } });
}

/** Get all active mailbox configs for polling. */
export async function getActiveEmailConfigs() {
  return prisma.emailConfig.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

type EmailConfigInput = {
  name: string;
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
  isDefault: boolean;
};

/** Create a new mailbox config. */
export async function createEmailConfig(data: EmailConfigInput) {
  if (data.isDefault) {
    await prisma.emailConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }
  return prisma.emailConfig.create({ data });
}

/** Update an existing mailbox config. */
export async function updateEmailConfig(
  id: string,
  data: Partial<EmailConfigInput>,
) {
  if (data.isDefault) {
    await prisma.emailConfig.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }
  return prisma.emailConfig.update({ where: { id }, data });
}

/** Delete a mailbox config. */
export async function deleteEmailConfig(id: string) {
  return prisma.emailConfig.delete({ where: { id } });
}

/**
 * @deprecated Use createEmailConfig/updateEmailConfig instead.
 * Kept for backward compatibility with the single-config form.
 */
export async function upsertEmailConfig(
  data: Omit<EmailConfigInput, "name" | "isDefault">,
) {
  const existing = await prisma.emailConfig.findFirst();

  if (existing) {
    return prisma.emailConfig.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.emailConfig.create({
    data: { ...data, name: "Default", isDefault: true },
  });
}
