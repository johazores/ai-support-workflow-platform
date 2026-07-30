import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAiProviderRuntimeEntries } from "@/features/ai-drafts/services/ai-provider-runtime";

const mocks = vi.hoisted(() => ({
  listAiProviderRuntimePolicies: vi.fn(),
  getProviderRuntimeConfiguration: vi.fn(),
  getBooleanSystemSetting: vi.fn(),
}));

vi.mock("@/features/providers/services/provider-service", () => ({
  listAiProviderRuntimePolicies: mocks.listAiProviderRuntimePolicies,
  getProviderRuntimeConfiguration: mocks.getProviderRuntimeConfiguration,
}));

vi.mock("@/features/system-settings/services/system-setting-service", () => ({
  getBooleanSystemSetting: mocks.getBooleanSystemSetting,
}));

const originalNodeEnv = process.env.NODE_ENV;

describe("resolveAiProviderRuntimeEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
      writable: true,
    });
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([]);
    mocks.getBooleanSystemSetting.mockResolvedValue(false);
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      configurable: true,
      writable: true,
    });
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

  it("excludes providers disabled by Root Admin", async () => {
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([
      { key: "openai", name: "OpenAI", priority: 1, mode: "disabled" },
    ]);

    await expect(resolveAiProviderRuntimeEntries()).resolves.toEqual([]);
  });

  it("uses stable registry order when providers share the same priority", async () => {
    mocks.listAiProviderRuntimePolicies.mockResolvedValue([
      { key: "deepseek", name: "DeepSeek", priority: 100, mode: "database" },
      { key: "openai", name: "OpenAI", priority: 100, mode: "database" },
      {
        key: "google-gemini",
        name: "Google Gemini",
        priority: 100,
        mode: "database",
      },
    ]);

    const entries = await resolveAiProviderRuntimeEntries();

    expect(entries.map((entry) => entry.name)).toEqual([
      "openai",
      "google-gemini",
      "deepseek",
    ]);
  });

  it("appends mock AI when enabled in database outside production", async () => {
    mocks.getBooleanSystemSetting.mockResolvedValue(true);

    const entries = await resolveAiProviderRuntimeEntries();

    expect(entries.map((entry) => entry.name)).toEqual(["mock"]);
  });

  it("never enables mock AI in production", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
      writable: true,
    });
    mocks.getBooleanSystemSetting.mockResolvedValue(true);

    await expect(resolveAiProviderRuntimeEntries()).resolves.toEqual([]);
    expect(mocks.getBooleanSystemSetting).not.toHaveBeenCalled();
  });
});
