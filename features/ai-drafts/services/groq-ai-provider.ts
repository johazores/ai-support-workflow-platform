import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const groqProvider = createOpenAiCompatibleProvider({
  key: "groq",
  displayName: "Groq",
  defaultBaseUrl: "https://api.groq.com/openai/v1",
});
