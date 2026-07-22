import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import { anthropicProvider } from "@/features/ai-drafts/services/anthropic-ai-provider";
import { AiProviderChain } from "@/features/ai-drafts/services/ai-provider-chain";
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
