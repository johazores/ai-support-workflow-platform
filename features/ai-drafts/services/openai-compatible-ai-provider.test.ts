import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOpenRouterHeaders,
  createOpenAiCompatibleProvider,
} from "@/features/ai-drafts/services/openai-compatible-ai-provider";

const mocks = vi.hoisted(() => ({
  getProviderRuntimeConfiguration: vi.fn(),
  chatCreate: vi.fn(),
  clientOptions: vi.fn(),
}));

vi.mock("@/features/providers/services/provider-service", () => ({
  getProviderRuntimeConfiguration: mocks.getProviderRuntimeConfiguration,
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: mocks.chatCreate,
      },
    };

    constructor(options: unknown) {
      mocks.clientOptions(options);
    }
  },
}));

const input = {
  organizationId: "org-1",
  subject: "Refund request",
  customerName: "Taylor",
  customerMessage: "Can you help with my refund?",
  tone: "empathetic" as const,
};

describe("createOpenAiCompatibleProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({
      mode: "environment",
    });
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { content: "  We can help with that.  " } }],
    });
  });

  afterEach(() => {
    delete process.env.TEST_PROVIDER_API_KEY;
    delete process.env.TEST_PROVIDER_MODEL;
  });

  it("prefers database-managed credential, model, base URL, and headers", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({
      mode: "database",
      key: "openrouter",
      name: "OpenRouter",
      credential: "db-secret",
      defaultModel: "db-model",
      baseUrl: "https://provider.example/v1",
      configuration: {
        httpReferer: "https://support.example.com",
        appTitle: "Support Platform",
      },
    });

    const provider = createOpenAiCompatibleProvider({
      key: "openrouter",
      displayName: "OpenRouter",
      envApiKeys: ["TEST_PROVIDER_API_KEY"],
      envModel: "TEST_PROVIDER_MODEL",
      defaultBaseUrl: "https://fallback.example/v1",
      defaultHeaders: buildOpenRouterHeaders,
    });

    await expect(provider.generateDraft(input)).resolves.toEqual({
      draft: "We can help with that.",
      model: "db-model",
    });
    expect(mocks.clientOptions).toHaveBeenCalledWith({
      apiKey: "db-secret",
      baseURL: "https://provider.example/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://support.example.com",
        "X-Title": "Support Platform",
      },
    });
    expect(mocks.chatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "db-model" }),
    );
  });

  it("falls back to environment credentials and model for unmanaged migration mode", async () => {
    process.env.TEST_PROVIDER_API_KEY = "env-secret";
    process.env.TEST_PROVIDER_MODEL = "env-model";

    const provider = createOpenAiCompatibleProvider({
      key: "custom",
      displayName: "Custom Provider",
      envApiKeys: ["TEST_PROVIDER_API_KEY"],
      envModel: "TEST_PROVIDER_MODEL",
      defaultBaseUrl: "https://provider.example/v1",
    });

    const result = await provider.generateDraft(input);

    expect(result.model).toBe("env-model");
    expect(mocks.clientOptions).toHaveBeenCalledWith({
      apiKey: "env-secret",
      baseURL: "https://provider.example/v1",
      defaultHeaders: undefined,
    });
  });

  it("does not let an environment key reactivate an explicitly disabled provider", async () => {
    process.env.TEST_PROVIDER_API_KEY = "env-secret";
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({ mode: "disabled" });
    const provider = createOpenAiCompatibleProvider({
      key: "custom",
      displayName: "Custom Provider",
      envApiKeys: ["TEST_PROVIDER_API_KEY"],
      defaultBaseUrl: "https://provider.example/v1",
      defaultModel: "model-1",
    });

    await expect(provider.generateDraft(input)).rejects.toThrow(
      "Custom Provider is disabled",
    );
    expect(mocks.chatCreate).not.toHaveBeenCalled();
  });

  it("requires an explicit model when no safe default exists", async () => {
    process.env.TEST_PROVIDER_API_KEY = "env-secret";
    const provider = createOpenAiCompatibleProvider({
      key: "custom",
      displayName: "Custom Provider",
      envApiKeys: ["TEST_PROVIDER_API_KEY"],
      envModel: "TEST_PROVIDER_MODEL",
      defaultBaseUrl: "https://provider.example/v1",
    });

    await expect(provider.generateDraft(input)).rejects.toThrow(
      "Custom Provider model is not configured",
    );
    expect(mocks.chatCreate).not.toHaveBeenCalled();
  });

  it("fails clearly when no credential exists", async () => {
    const provider = createOpenAiCompatibleProvider({
      key: "custom",
      displayName: "Custom Provider",
      envApiKeys: ["TEST_PROVIDER_API_KEY"],
      defaultBaseUrl: "https://provider.example/v1",
      defaultModel: "model-1",
    });

    await expect(provider.generateDraft(input)).rejects.toThrow(
      "Custom Provider is not configured",
    );
  });

  it("rejects empty provider responses", async () => {
    process.env.TEST_PROVIDER_API_KEY = "env-secret";
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { content: "   " } }],
    });
    const provider = createOpenAiCompatibleProvider({
      key: "custom",
      displayName: "Custom Provider",
      envApiKeys: ["TEST_PROVIDER_API_KEY"],
      defaultBaseUrl: "https://provider.example/v1",
      defaultModel: "model-1",
    });

    await expect(provider.generateDraft(input)).rejects.toThrow(
      "Custom Provider returned an empty response",
    );
  });
});
