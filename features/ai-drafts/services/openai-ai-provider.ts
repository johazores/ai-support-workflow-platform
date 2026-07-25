import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const openAiProvider = createOpenAiCompatibleProvider({
  key: "openai",
  displayName: "OpenAI",
  envApiKeys: ["OPENAI_API_KEY"],
  envModel: "OPENAI_MODEL",
  defaultBaseUrl: "https://api.openai.com/v1",
  defaultModel: "gpt-4.1-mini",
});
