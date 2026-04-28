import { describe, it, expect } from "vitest";
import { AiProviderChain } from "@/features/ai-drafts/services/ai-provider-chain";
import type { AiDraftProvider } from "@/features/ai-drafts/types/ai-provider";
import { vi } from "vitest";

// Mock prisma to avoid DB dependency
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

function createMockProvider(
  draft: string,
  shouldFail = false,
): AiDraftProvider {
  return {
    async generateDraft() {
      if (shouldFail) throw new Error("Provider failed");
      return { draft };
    },
  };
}

describe("AiProviderChain", () => {
  const input = {
    subject: "Test",
    customerName: "User",
    customerMessage: "Hello",
  };

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
});
