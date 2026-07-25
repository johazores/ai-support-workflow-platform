import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProviderRuntimeConfiguration,
  listAiProviderRuntimePolicies,
  saveProvider,
} from "@/features/providers/services/provider-service";

const mocks = vi.hoisted(() => ({
  providerUpsert: vi.fn(),
  providerFindUnique: vi.fn(),
  providerFindMany: vi.fn(),
  credentialFindMany: vi.fn(),
  credentialFindFirst: vi.fn(),
  credentialUpdateMany: vi.fn(),
  credentialCreate: vi.fn(),
  credentialUpdate: vi.fn(),
  encryptSecret: vi.fn((value: string) => `encrypted:${value}`),
  decryptSecret: vi.fn((value: string) => value.replace(/^encrypted:/, "")),
  maskSecret: vi.fn(() => "••••1234"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider: {
      upsert: mocks.providerUpsert,
      findUnique: mocks.providerFindUnique,
      findMany: mocks.providerFindMany,
    },
    providerCredential: {
      findMany: mocks.credentialFindMany,
      findFirst: mocks.credentialFindFirst,
      updateMany: mocks.credentialUpdateMany,
      create: mocks.credentialCreate,
      update: mocks.credentialUpdate,
    },
  },
}));

vi.mock("@/lib/secret-encryption", () => ({
  encryptSecret: mocks.encryptSecret,
  decryptSecret: mocks.decryptSecret,
  maskSecret: mocks.maskSecret,
}));

function provider(overrides: Record<string, unknown> = {}) {
  return {
    id: "provider-1",
    key: "openai",
    name: "OpenAI",
    category: "ai",
    isEnabled: false,
    priority: 100,
    defaultModel: null,
    baseUrl: null,
    configuration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("provider runtime management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.providerUpsert.mockResolvedValue(provider());
    mocks.providerFindUnique.mockResolvedValue(null);
    mocks.providerFindMany.mockResolvedValue([]);
    mocks.credentialFindMany.mockResolvedValue([]);
    mocks.credentialFindFirst.mockResolvedValue(null);
    mocks.credentialUpdateMany.mockResolvedValue({ count: 0 });
    mocks.credentialCreate.mockResolvedValue({ id: "credential-1" });
  });

  it("treats an untouched catalog row as environment migration mode", async () => {
    mocks.providerFindUnique.mockResolvedValue(provider());

    await expect(getProviderRuntimeConfiguration("openai")).resolves.toEqual({
      mode: "environment",
    });
  });

  it("respects an explicitly managed disabled provider", async () => {
    mocks.providerFindUnique.mockResolvedValue(
      provider({ configuration: { runtimeManaged: true } }),
    );

    await expect(getProviderRuntimeConfiguration("openai")).resolves.toEqual({
      mode: "disabled",
    });
  });

  it("infers legacy database management from an active credential", async () => {
    mocks.providerFindUnique.mockResolvedValue(
      provider({ isEnabled: true, defaultModel: "db-model" }),
    );
    mocks.credentialFindFirst.mockResolvedValue({
      id: "credential-1",
      encryptedValue: "encrypted:db-secret",
    });

    await expect(getProviderRuntimeConfiguration("openai")).resolves.toEqual({
      mode: "database",
      key: "openai",
      name: "OpenAI",
      defaultModel: "db-model",
      baseUrl: null,
      configuration: null,
      credential: "db-secret",
    });
  });

  it("marks the provider runtime-managed while preserving existing JSON config", async () => {
    mocks.providerFindUnique.mockResolvedValue(
      provider({ configuration: { appTitle: "Support Platform" } }),
    );

    await saveProvider({
      key: "openrouter",
      name: "OpenRouter",
      category: "ai",
      isEnabled: false,
      priority: 25,
      defaultModel: "model-1",
      configuration: { httpReferer: "https://support.example.com" },
    });

    expect(mocks.providerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "openrouter" },
        update: expect.objectContaining({
          configuration: {
            appTitle: "Support Platform",
            httpReferer: "https://support.example.com",
            runtimeManaged: true,
          },
        }),
      }),
    );
  });

  it("returns AI runtime policies in database priority order with explicit modes", async () => {
    mocks.providerFindMany.mockResolvedValue([
      provider({
        id: "p2",
        key: "anthropic",
        name: "Anthropic",
        isEnabled: true,
        priority: 10,
        configuration: { runtimeManaged: true },
      }),
      provider({
        id: "p1",
        key: "openai",
        name: "OpenAI",
        isEnabled: false,
        priority: 20,
        configuration: { runtimeManaged: true },
      }),
      provider({
        id: "p3",
        key: "groq",
        name: "Groq",
        priority: 100,
      }),
    ]);

    const result = await listAiProviderRuntimePolicies();

    expect(result).toEqual([
      { key: "anthropic", name: "Anthropic", priority: 10, mode: "database" },
      { key: "openai", name: "OpenAI", priority: 20, mode: "disabled" },
      { key: "groq", name: "Groq", priority: 100, mode: "environment" },
    ]);
  });
});
