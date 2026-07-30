import {
  buildOpenRouterHeaders,
  createOpenAiCompatibleProvider,
} from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const openRouterProvider = createOpenAiCompatibleProvider({
  key: "openrouter",
  displayName: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  defaultHeaders: buildOpenRouterHeaders,
});
