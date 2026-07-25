import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiProviderChain } from "@/features/ai-drafts/services/ai-provider-chain";
import type { AiDraftProvider } from "@/features/ai-drafts/types/ai-provider";

const prismaMocks = vi.hoisted(() => ({
  aiUsageCreate: vi.fn(),
  providerFindUnique: vi.fn(),
  providerUsageCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageLog: {
      create: prismaMocks.aiUsageCreate,
    },
    provider: {
      findUnique: prismaMocks.providerFindUnique,
    },
    providerUsageRecord: {
      create: prismaMocks.providerUsageCreate,
    },
  },
}));

function createMockProvider(
  draft: string,
  shouldFail = false,
  model?: string,
): AiDraftProvider {
  return {
    async generateDraft() {
      if (shouldFail) throw new Error("Provider failed");
      return { draft, ...(model ? { model } : {}) };
    },
  };
}

describe("AiProviderChain", () => {
  const input = {
    organizationId: "org-1",
    subject: "Test",
    customerName: "User",
    customerMessage: "Hello",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.aiUsageCreate.mockResolvedValue({});
    prismaMocks.providerFindUnique.mockResolvedValue(null);
    prismaMocks.providerUsageCreate.mockResolvedValue({});
  });

  it("uses the first provider when it succeeds", async () => {
    const chain = new AiProviderChain([
      {
        name: "primary",
        model: "m1",
        provider: createMockProvider("primary-response"),
      },
      {
        name: "fallback",
        model: "m2",
        provider: createMockProvider("fallback-response"),
      },
    ]);

    const result = await chain.generate(input);
    expect(result.draft).toBe("primary-response");
  });

  it("falls back to second provider when first fails", async () => {
    const chain = new AiProviderChain([
      { name: "primary", model: "m1", provider: createMockProvider("", true) },
      {
        name: "fallback",
        model: "m2",
        provider: createMockProvider("fallback-response"),
      },
    ]);

    const result = await chain.generate(input);
    expect(result.draft).toBe("fallback-response");
  });

  it("throws when all providers fail", async () => {
    const chain = new AiProviderChain([
      { name: "p1", model: "m1", provider: createMockProvider("", true) },
      { name: "p2", model: "m2", provider: createMockProvider("", true) },
    ]);

    await expect(chain.generate(input)).rejects.toThrow("Provider failed");
  });

  it("works with a single provider", async () => {
    const chain = new AiProviderChain([
      {
        name: "only",
        model: "m1",
        provider: createMockProvider("only-response"),
      },
    ]);

    const result = await chain.generate(input);
    expect(result.draft).toBe("only-response");
  });

  it("records the actual model returned by the provider", async () => {
    prismaMocks.providerFindUnique.mockResolvedValue({ id: "provider-1" });
    const chain = new AiProviderChain([
      {
        name: "primary",
        model: "database-configured",
        provider: createMockProvider("response", false, "actual-model-v2"),
      },
    ]);

    await chain.generate(input);

    expect(prismaMocks.aiUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        provider: "primary",
        model: "actual-model-v2",
        success: true,
      }),
    });
    expect(prismaMocks.providerUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: "provider-1",
        model: "actual-model-v2",
        success: true,
      }),
    });
  });

  it("returns a successful draft when telemetry persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMocks.aiUsageCreate.mockRejectedValueOnce(new Error("metrics unavailable"));

    const chain = new AiProviderChain([
      {
        name: "primary",
        model: "m1",
        provider: createMockProvider("response"),
      },
    ]);

    await expect(chain.generate(input)).resolves.toEqual({ draft: "response" });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to record AI provider usage for primary:",
      "metrics unavailable",
    );

    errorSpy.mockRestore();
  });
});
