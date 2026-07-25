import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const deepSeekProvider = createOpenAiCompatibleProvider({
  key: "deepseek",
  displayName: "DeepSeek",
  envApiKeys: ["DEEPSEEK_API_KEY"],
  envModel: "DEEPSEEK_MODEL",
  defaultBaseUrl: "https://api.deepseek.com",
  defaultModel: "deepseek-v4-flash",
});
