import { anthropicProvider } from "@/features/ai-drafts/services/anthropic-ai-provider";
import { AiProviderChain } from "@/features/ai-drafts/services/ai-provider-chain";
import { deepSeekProvider } from "@/features/ai-drafts/services/deepseek-ai-provider";
import { googleGeminiProvider } from "@/features/ai-drafts/services/google-gemini-ai-provider";
import { groqProvider } from "@/features/ai-drafts/services/groq-ai-provider";
import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import { openRouterProvider } from "@/features/ai-drafts/services/openrouter-ai-provider";
import { togetherAiProvider } from "@/features/ai-drafts/services/together-ai-provider";
import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

type ProviderEntry = ConstructorParameters<typeof AiProviderChain>[0][number];

function buildProviderChain(): AiProviderChain {
  const providers: ProviderEntry[] = [
    {
      name: "openai",
      model: process.env.OPENAI_MODEL ?? "database-configured",
      provider: openAiProvider,
    },
    {
      name: "anthropic",
      model: process.env.ANTHROPIC_MODEL ?? "database-configured",
      provider: anthropicProvider,
    },
    {
      name: "google-gemini",
      model: process.env.GEMINI_MODEL ?? "database-configured",
      provider: googleGeminiProvider,
    },
    {
      name: "openrouter",
      model: process.env.OPENROUTER_MODEL ?? "database-configured",
      provider: openRouterProvider,
    },
    {
      name: "groq",
      model: process.env.GROQ_MODEL ?? "database-configured",
      provider: groqProvider,
    },
    {
      name: "together-ai",
      model: process.env.TOGETHER_MODEL ?? "database-configured",
      provider: togetherAiProvider,
    },
    {
      name: "deepseek",
      model: process.env.DEEPSEEK_MODEL ?? "database-configured",
      provider: deepSeekProvider,
    },
  ];

  const allowMock =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_MOCK_AI === "true";

  if (allowMock) {
    providers.push({
      name: "mock",
      model: "mock-model",
      provider: mockAiProvider,
    });
  }

  return new AiProviderChain(providers);
}

export async function generateAiDraftReply(input: GenerateDraftInput) {
  return buildProviderChain().generate(input);
}
