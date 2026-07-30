import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const openAiProvider = createOpenAiCompatibleProvider({
  key: "openai",
  displayName: "OpenAI",
  defaultBaseUrl: "https://api.openai.com/v1",
});
