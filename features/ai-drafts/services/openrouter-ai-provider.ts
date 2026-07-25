import {
  buildOpenRouterHeaders,
  createOpenAiCompatibleProvider,
} from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const openRouterProvider = createOpenAiCompatibleProvider({
  key: "openrouter",
  displayName: "OpenRouter",
  envApiKeys: ["OPENROUTER_API_KEY"],
  envModel: "OPENROUTER_MODEL",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  defaultHeaders: buildOpenRouterHeaders,
});
