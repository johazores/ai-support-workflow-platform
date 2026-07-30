import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/secret-encryption";

export type SystemSettingInput = {
  key: string;
  category: string;
  value: unknown;
  isSecret: boolean;
  description?: string;
  updatedByRootAdminId: string;
};

export async function listSystemSettings() {
  const settings = await prisma.systemSetting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return settings.map((setting) => ({
    id: setting.id,
    key: setting.key,
    category: setting.category,
    value: setting.isSecret
      ? maskSecret(setting.encryptedValue)
      : setting.value,
    isSecret: setting.isSecret,
    isConfigured: setting.isSecret ? Boolean(setting.encryptedValue) : true,
    description: setting.description,
    updatedAt: setting.updatedAt,
  }));
}

export async function getSystemSetting<T = unknown>(
  key: string,
): Promise<T | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (!setting) return null;

  if (setting.isSecret) {
    if (!setting.encryptedValue) return null;
    return decryptSecret(setting.encryptedValue) as T;
  }

  return setting.value as T;
}

export async function getBooleanSystemSetting(
  key: string,
  defaultValue = false,
): Promise<boolean> {
  const value = await getSystemSetting<unknown>(key);

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return defaultValue;
}

export async function upsertSystemSetting(input: SystemSettingInput) {
  const encryptedValue = input.isSecret
    ? encryptSecret(String(input.value))
    : null;

  return prisma.systemSetting.upsert({
    where: { key: input.key },
    update: {
      category: input.category,
      value: input.isSecret ? null : (input.value as never),
      encryptedValue,
      isSecret: input.isSecret,
      description: input.description,
      updatedByRootAdminId: input.updatedByRootAdminId,
    },
    create: {
      key: input.key,
      category: input.category,
      value: input.isSecret ? null : (input.value as never),
      encryptedValue,
      isSecret: input.isSecret,
      description: input.description,
      updatedByRootAdminId: input.updatedByRootAdminId,
    },
  });
}

export async function deleteSystemSetting(id: string) {
  return prisma.systemSetting.delete({ where: { id } });
}
