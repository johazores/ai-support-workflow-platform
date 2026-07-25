import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const togetherAiProvider = createOpenAiCompatibleProvider({
  key: "together-ai",
  displayName: "Together AI",
  envApiKeys: ["TOGETHER_API_KEY"],
  envModel: "TOGETHER_MODEL",
  defaultBaseUrl: "https://api.together.xyz/v1",
});
