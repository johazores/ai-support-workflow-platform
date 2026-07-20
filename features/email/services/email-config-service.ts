import type { EmailConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  encryptSecret,
  isEncryptedSecret,
  readStoredSecret,
} from "@/lib/secret-encryption";

function decryptMailbox(config: EmailConfig): EmailConfig {
  return {
    ...config,
    smtpPass: readStoredSecret(config.smtpPass),
    imapPass: readStoredSecret(config.imapPass),
  };
}

function organizationWhere(organizationId?: string) {
  return organizationId
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : {};
}

function isMaskedSecret(value: string) {
  return value.includes("•") || value === "********";
}

function encryptNewSecret(value: string) {
  return isEncryptedSecret(value) ? value : encryptSecret(value);
}

/** Get a mailbox config for server-side connection use. */
export async function getEmailConfigById(id: string, organizationId?: string) {
  const config = await prisma.emailConfig.findFirst({
    where: { id, ...organizationWhere(organizationId) },
  });
  return config ? decryptMailbox(config) : null;
}

/** Get the default active mailbox for server-side connection use. */
export async function getEmailConfig(organizationId?: string) {
  const tenantFilter = organizationWhere(organizationId);
  const config =
    (await prisma.emailConfig.findFirst({
      where: { ...tenantFilter, isDefault: true, isActive: true },
    })) ??
    (await prisma.emailConfig.findFirst({
      where: { ...tenantFilter, isActive: true },
      orderBy: { updatedAt: "desc" },
    }));

  return config ? decryptMailbox(config) : null;
}

/** List stored mailbox metadata. Password values remain encrypted. */
export async function listEmailConfigs(organizationId?: string) {
  return prisma.emailConfig.findMany({
    where: organizationWhere(organizationId),
    orderBy: { createdAt: "asc" },
  });
}

/** Get all active mailboxes with decrypted passwords for IMAP polling. */
export async function getActiveEmailConfigs(organizationId?: string) {
  const configs = await prisma.emailConfig.findMany({
    where: { ...organizationWhere(organizationId), isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return configs.map(decryptMailbox);
}

type EmailConfigInput = {
  organizationId?: string;
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

/** Create a mailbox with encrypted SMTP and IMAP passwords. */
export async function createEmailConfig(data: EmailConfigInput) {
  if (data.isDefault) {
    await prisma.emailConfig.updateMany({
      where: {
        isDefault: true,
        ...(data.organizationId
          ? { organizationId: data.organizationId }
          : {}),
      },
      data: { isDefault: false },
    });
  }

  return prisma.emailConfig.create({
    data: {
      ...data,
      smtpPass: encryptNewSecret(data.smtpPass),
      imapPass: encryptNewSecret(data.imapPass),
    },
  });
}

/** Update a mailbox while preserving masked password placeholders. */
export async function updateEmailConfig(
  id: string,
  data: Partial<EmailConfigInput>,
  organizationId?: string,
) {
  const existing = await prisma.emailConfig.findFirst({
    where: { id, ...organizationWhere(organizationId) },
  });
  if (!existing) throw new Error("Mailbox not found");

  const updateData: Partial<EmailConfigInput> = {
    ...data,
    ...(organizationId ? { organizationId } : {}),
  };

  if (updateData.smtpPass) {
    if (isMaskedSecret(updateData.smtpPass)) delete updateData.smtpPass;
    else updateData.smtpPass = encryptNewSecret(updateData.smtpPass);
  }

  if (updateData.imapPass) {
    if (isMaskedSecret(updateData.imapPass)) delete updateData.imapPass;
    else updateData.imapPass = encryptNewSecret(updateData.imapPass);
  }

  if (data.isDefault) {
    await prisma.emailConfig.updateMany({
      where: {
        isDefault: true,
        id: { not: id },
        ...(organizationId
          ? { organizationId }
          : existing.organizationId
            ? { organizationId: existing.organizationId }
            : {}),
      },
      data: { isDefault: false },
    });
  }

  return prisma.emailConfig.update({ where: { id }, data: updateData });
}

export async function deleteEmailConfig(id: string, organizationId?: string) {
  const existing = await prisma.emailConfig.findFirst({
    where: { id, ...organizationWhere(organizationId) },
  });
  if (!existing) throw new Error("Mailbox not found");
  return prisma.emailConfig.delete({ where: { id } });
}

/** @deprecated Use createEmailConfig/updateEmailConfig instead. */
export async function upsertEmailConfig(
  data: Omit<EmailConfigInput, "name" | "isDefault">,
) {
  const existing = await prisma.emailConfig.findFirst();

  if (existing) {
    return updateEmailConfig(existing.id, data);
  }

  return createEmailConfig({ ...data, name: "Default", isDefault: true });
}
