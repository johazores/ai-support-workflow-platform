import { createOpenAiCompatibleProvider } from "@/features/ai-drafts/services/openai-compatible-ai-provider";

export const groqProvider = createOpenAiCompatibleProvider({
  key: "groq",
  displayName: "Groq",
  envApiKeys: ["GROQ_API_KEY"],
  envModel: "GROQ_MODEL",
  defaultBaseUrl: "https://api.groq.com/openai/v1",
  defaultModel: "openai/gpt-oss-20b",
});
