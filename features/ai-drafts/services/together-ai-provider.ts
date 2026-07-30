import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const togetherAiProvider = createOpenAiCompatibleProvider({
  key: "together-ai",
  displayName: "Together AI",
  defaultBaseUrl: "https://api.together.xyz/v1",
});
