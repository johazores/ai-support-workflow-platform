import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/secret-encryption";

export const providerCatalog = [
  { key: "openai", name: "OpenAI", category: "ai" },
  { key: "anthropic", name: "Anthropic", category: "ai" },
  { key: "google-gemini", name: "Google Gemini", category: "ai" },
  { key: "openrouter", name: "OpenRouter", category: "ai" },
  { key: "groq", name: "Groq", category: "ai" },
  { key: "together-ai", name: "Together AI", category: "ai" },
  { key: "deepseek", name: "DeepSeek", category: "ai" },
  { key: "slack", name: "Slack", category: "messaging" },
  { key: "discord", name: "Discord", category: "messaging" },
  { key: "smtp", name: "SMTP", category: "email" },
  { key: "resend", name: "Resend", category: "email" },
  { key: "twilio", name: "Twilio", category: "messaging" },
  { key: "stripe", name: "Stripe", category: "billing" },
  { key: "clerk", name: "Clerk", category: "authentication" },
  { key: "github", name: "GitHub", category: "developer" },
  { key: "redis", name: "Redis", category: "infrastructure" },
  { key: "database", name: "Database", category: "infrastructure" },
  { key: "storage", name: "Storage", category: "infrastructure" },
] as const;

type ProviderConfiguration = Record<string, unknown>;

export type ProviderRuntimeMode = "database" | "disabled";

export type ProviderRuntimePolicy = {
  key: string;
  name: string;
  priority: number;
  mode: ProviderRuntimeMode;
};

export type ProviderRuntimeConfiguration =
  | { mode: "disabled" }
  | {
      mode: "database";
      key: string;
      name: string;
      defaultModel: string | null;
      baseUrl: string | null;
      configuration: unknown;
      credential: string | null;
    };

function asConfiguration(value: unknown): ProviderConfiguration {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as ProviderConfiguration) }
    : {};
}

export async function ensureProviderCatalog() {
  await Promise.all(
    providerCatalog.map((definition) =>
      prisma.provider.upsert({
        where: { key: definition.key },
        update: {
          name: definition.name,
          category: definition.category,
        },
        create: {
          key: definition.key,
          name: definition.name,
          category: definition.category,
        },
      }),
    ),
  );
}

export async function listProviders() {
  await ensureProviderCatalog();

  const providers = await prisma.provider.findMany({
    orderBy: [{ category: "asc" }, { priority: "asc" }, { name: "asc" }],
  });

  const credentials = await prisma.providerCredential.findMany({
    where: { isActive: true },
  });
  const credentialsByProvider = new Map(
    credentials.map((credential) => [credential.providerId, credential]),
  );

  return providers.map((provider) => {
    const credential = credentialsByProvider.get(provider.id);

    return {
      ...provider,
      runtimeMode: provider.isEnabled ? "database" : "disabled",
      credential: credential
        ? {
            id: credential.id,
            label: credential.label,
            maskedValue: maskSecret(credential.encryptedValue),
            lastFour: credential.lastFour,
            lastTestedAt: credential.lastTestedAt,
            lastTestStatus: credential.lastTestStatus,
            lastError: credential.lastError,
          }
        : null,
    };
  });
}

type SaveProviderInput = {
  key: string;
  name?: string;
  category?: string;
  isEnabled: boolean;
  priority: number;
  defaultModel?: string;
  baseUrl?: string;
  configuration?: Record<string, unknown>;
  credential?: string;
  credentialLabel?: string;
};

export async function saveProvider(input: SaveProviderInput) {
  const existing = await prisma.provider.findUnique({ where: { key: input.key } });
  const configuration = {
    ...asConfiguration(existing?.configuration),
    ...(input.configuration ?? {}),
  };

  const provider = await prisma.provider.upsert({
    where: { key: input.key },
    update: {
      name: input.name,
      category: input.category,
      isEnabled: input.isEnabled,
      priority: input.priority,
      defaultModel: input.defaultModel || null,
      baseUrl: input.baseUrl || null,
      configuration: configuration as never,
    },
    create: {
      key: input.key,
      name: input.name || input.key,
      category: input.category || "custom",
      isEnabled: input.isEnabled,
      priority: input.priority,
      defaultModel: input.defaultModel || null,
      baseUrl: input.baseUrl || null,
      configuration: configuration as never,
    },
  });

  if (input.credential?.trim()) {
    await prisma.providerCredential.updateMany({
      where: { providerId: provider.id, isActive: true },
      data: { isActive: false },
    });

    const value = input.credential.trim();
    await prisma.providerCredential.create({
      data: {
        providerId: provider.id,
        label: input.credentialLabel?.trim() || "Primary",
        encryptedValue: encryptSecret(value),
        lastFour: value.slice(-4),
      },
    });
  }

  return provider;
}

export async function getProviderRuntimeConfiguration(
  key: string,
): Promise<ProviderRuntimeConfiguration> {
  const provider = await prisma.provider.findUnique({ where: { key } });
  if (!provider?.isEnabled) return { mode: "disabled" };

  const credential = await prisma.providerCredential.findFirst({
    where: { providerId: provider.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    mode: "database",
    key: provider.key,
    name: provider.name,
    defaultModel: provider.defaultModel,
    baseUrl: provider.baseUrl,
    configuration: provider.configuration,
    credential: credential ? decryptSecret(credential.encryptedValue) : null,
  };
}

export async function listAiProviderRuntimePolicies(): Promise<
  ProviderRuntimePolicy[]
> {
  await ensureProviderCatalog();

  const providers = await prisma.provider.findMany({
    where: { category: "ai" },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  return providers.map((provider) => ({
    key: provider.key,
    name: provider.name,
    priority: provider.priority,
    mode: provider.isEnabled ? "database" : "disabled",
  }));
}

export async function getEnabledProviderConfiguration(key: string) {
  const runtime = await getProviderRuntimeConfiguration(key);
  return runtime.mode === "database" ? runtime : null;
}

export async function updateProviderTestResult(
  providerId: string,
  result: { success: boolean; error?: string },
) {
  const credential = await prisma.providerCredential.findFirst({
    where: { providerId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!credential) return;

  await prisma.providerCredential.update({
    where: { id: credential.id },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: result.success ? "success" : "failed",
      lastError: result.success ? null : result.error?.slice(0, 1000),
    },
  });
}
