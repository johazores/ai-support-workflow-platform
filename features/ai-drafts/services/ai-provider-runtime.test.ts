import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAiProviderRuntimeEntries } from "@/features/ai-drafts/services/ai-provider-runtime";

const mocks = vi.hoisted(() => ({
  listAiProviderRuntimePolicies: vi.fn(),
  getProviderRuntimeConfiguration: vi.fn(),
}));

vi.mock("@/features/providers/services/provider-service", () => ({
  listAiProviderRuntimePolicies: mocks.listAiProviderRuntimePolicies,
  getProviderRuntimeConfiguration: mocks.getProviderRuntimeConfiguration,
}));

const originalNodeEnv = process.env.NODE_ENV;

function clearProviderEnvironment() {
  for (const key of [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
    "OPENROUTER_API_KEY",
    "GROQ_API_KEY",
    "TOGETHER_API_KEY",
    "DEEPSEEK_API_KEY",
    "ALLOW_MOCK_AI",
  ]) {
    delete process.env[key];
  }
}

describe("resolveAiProviderRuntimeEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProviderEnvironment();
    process.env.NODE_ENV = "test";
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([]);
  });

  afterEach(() => {
    clearProviderEnvironment();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("orders database-managed providers by Root Admin priority", async () => {
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([
      { key: "openai", name: "OpenAI", priority: 30, mode: "database" },
      { key: "anthropic", name: "Anthropic", priority: 10, mode: "database" },
      { key: "groq", name: "Groq", priority: 20, mode: "database" },
    ]);

    const entries = await resolveAiProviderRuntimeEntries();

    expect(entries.map((entry) => entry.name)).toEqual([
      "anthropic",
      "groq",
      "openai",
    ]);
  });

  it("includes unmanaged environment providers only when a credential exists", async () => {
    process.env.OPENROUTER_API_KEY = "env-openrouter";
    process.env.OPENROUTER_MODEL = "env-model";
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([
      { key: "openrouter", name: "OpenRouter", priority: 12, mode: "environment" },
      { key: "together-ai", name: "Together AI", priority: 15, mode: "environment" },
    ]);

    const entries = await resolveAiProviderRuntimeEntries();

    expect(entries.map((entry) => entry.name)).toEqual(["openrouter"]);
    expect(entries[0]?.model).toBe("env-model");
    delete process.env.OPENROUTER_MODEL;
  });

  it("excludes explicitly disabled providers even when legacy environment keys remain", async () => {
    process.env.OPENAI_API_KEY = "legacy-key";
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([
      { key: "openai", name: "OpenAI", priority: 1, mode: "disabled" },
    ]);

    await expect(resolveAiProviderRuntimeEntries()).resolves.toEqual([]);
  });

  it("uses stable registry order when providers share the same priority", async () => {
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([
      { key: "deepseek", name: "DeepSeek", priority: 100, mode: "database" },
      { key: "openai", name: "OpenAI", priority: 100, mode: "database" },
      { key: "google-gemini", name: "Google Gemini", priority: 100, mode: "database" },
    ]);

    const entries = await resolveAiProviderRuntimeEntries();

    expect(entries.map((entry) => entry.name)).toEqual([
      "openai",
      "google-gemini",
      "deepseek",
    ]);
  });

  it("appends mock AI only in explicitly enabled non-production mode", async () => {
    process.env.ALLOW_MOCK_AI = "true";

    const entries = await resolveAiProviderRuntimeEntries();

    expect(entries.map((entry) => entry.name)).toEqual(["mock"]);
  });
});
