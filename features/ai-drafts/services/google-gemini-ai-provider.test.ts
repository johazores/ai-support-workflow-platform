import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { googleGeminiProvider } from "@/features/ai-drafts/services/google-gemini-ai-provider";

const mocks = vi.hoisted(() => ({
  getEnabledProviderConfiguration: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/features/providers/services/provider-service", () => ({
  getEnabledProviderConfiguration: mocks.getEnabledProviderConfiguration,
}));

const input = {
  organizationId: "org-1",
  subject: "Account issue",
  customerName: "Jordan",
  customerMessage: "I cannot access my account.",
  tone: "friendly" as const,
};

describe("googleGeminiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnabledProviderConfiguration.mockResolvedValue(null);
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("uses database configuration and reports the actual model", async () => {
    mocks.getEnabledProviderConfiguration.mockResolvedValue({
      credential: "db-gemini-key",
      defaultModel: "models/custom-gemini-model",
      baseUrl: "https://gemini.example/v1beta/",
      configuration: null,
    });
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Hello Jordan." }, { text: "We can help." }],
            },
          },
        ],
      }),
    });

    await expect(googleGeminiProvider.generateDraft(input)).resolves.toEqual({
      draft: "Hello Jordan.\nWe can help.",
      model: "custom-gemini-model",
    });

    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://gemini.example/v1beta/models/custom-gemini-model:generateContent?key=db-gemini-key",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      }),
    );

    const request = mocks.fetch.mock.calls[0]?.[1] as { body: string };
    const body = JSON.parse(request.body) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    expect(body.systemInstruction.parts[0]?.text).toContain(
      "customer support assistant",
    );
    expect(body.contents[0]?.parts[0]?.text).toContain("Account issue");
  });

  it("falls back to environment configuration", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    process.env.GEMINI_MODEL = "env-model";
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Draft" }] } }],
      }),
    });

    const result = await googleGeminiProvider.generateDraft(input);

    expect(result).toEqual({ draft: "Draft", model: "env-model" });
    expect(mocks.fetch.mock.calls[0]?.[0]).toContain(
      "/models/env-model:generateContent?key=env-key",
    );
  });

  it("fails clearly when Gemini is not configured", async () => {
    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini is not configured",
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("surfaces non-success HTTP responses", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    mocks.fetch.mockResolvedValue({ ok: false, status: 429 });

    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini API request failed with HTTP 429",
    );
  });

  it("rejects an empty Gemini response", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [] } }] }),
    });

    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini returned an empty response",
    );
  });
});
