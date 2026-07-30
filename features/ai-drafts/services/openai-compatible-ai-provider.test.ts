import { beforeEach, describe, expect, it, vi } from "vitest";
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

function createProvider() {
  return createOpenAiCompatibleProvider({
    key: "openrouter",
    displayName: "OpenRouter",
    defaultBaseUrl: "https://fallback.example/v1",
    defaultHeaders: buildOpenRouterHeaders,
  });
}

describe("createOpenAiCompatibleProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({ mode: "disabled" });
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { content: "  We can help with that.  " } }],
    });
  });

  it("uses database-managed credential, model, base URL, and headers", async () => {
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

    await expect(createProvider().generateDraft(input)).resolves.toEqual({
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

  it("rejects providers disabled in Root Admin", async () => {
    await expect(createProvider().generateDraft(input)).rejects.toThrow(
      "OpenRouter is disabled",
    );
    expect(mocks.chatCreate).not.toHaveBeenCalled();
  });

  it("fails clearly when no database credential exists", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({
      mode: "database",
      key: "openrouter",
      name: "OpenRouter",
      credential: null,
      defaultModel: "db-model",
      baseUrl: null,
      configuration: null,
    });

    await expect(createProvider().generateDraft(input)).rejects.toThrow(
      "OpenRouter is not configured",
    );
  });

  it("requires the model to be configured in Root Admin", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({
      mode: "database",
      key: "openrouter",
      name: "OpenRouter",
      credential: "db-secret",
      defaultModel: null,
      baseUrl: null,
      configuration: null,
    });

    await expect(createProvider().generateDraft(input)).rejects.toThrow(
      "OpenRouter model is not configured",
    );
    expect(mocks.chatCreate).not.toHaveBeenCalled();
  });

  it("rejects empty provider responses", async () => {
    mocks.getProviderRuntimeConfiguration.mockResolvedValue({
      mode: "database",
      key: "openrouter",
      name: "OpenRouter",
      credential: "db-secret",
      defaultModel: "db-model",
      baseUrl: null,
      configuration: null,
    });
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { content: "   " } }],
    });

    await expect(createProvider().generateDraft(input)).rejects.toThrow(
      "OpenRouter returned an empty response",
    );
  });
});
