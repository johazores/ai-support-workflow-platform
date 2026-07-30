import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { googleGeminiProvider } from "@/features/ai-drafts/services/google-gemini-ai-provider";

const mocks = vi.hoisted(() => ({
  getProviderRuntimeConfiguration: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/features/providers/services/provider-service", () => ({
  getProviderRuntimeConfiguration: mocks.getProviderRuntimeConfiguration,
}));

const input = {
  organizationId: "org-1",
  subject: "Account issue",
  customerName: "Jordan",
  customerMessage: "I cannot access my account.",
  tone: "friendly" as const,
};

function configuredRuntime(overrides: Record<string, unknown> = {}) {
  return {
    mode: "database",
    key: "google-gemini",
    name: "Google Gemini",
    credential: "db-gemini-key",
    defaultModel: "models/custom-gemini-model",
    baseUrl: "https://gemini.example/v1beta/",
    configuration: null,
    ...overrides,
  };
}

describe("googleGeminiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({ mode: "disabled" });
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses database configuration and reports the actual model", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue(configuredRuntime());
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
  });

  it("rejects a provider disabled in Root Admin", async () => {
    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini is disabled",
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("fails clearly when the database credential is missing", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue(
      configuredRuntime({ credential: null }),
    );

    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini is not configured",
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("requires the model to be configured in Root Admin", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue(
      configuredRuntime({ defaultModel: null }),
    );

    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini model is not configured",
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("surfaces non-success HTTP responses", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue(configuredRuntime());
    mocks.fetch.mockResolvedValue({ ok: false, status: 429 });

    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini API request failed with HTTP 429",
    );
  });

  it("rejects an empty Gemini response", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue(configuredRuntime());
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [] } }] }),
    });

    await expect(googleGeminiProvider.generateDraft(input)).rejects.toThrow(
      "Google Gemini returned an empty response",
    );
  });
});
