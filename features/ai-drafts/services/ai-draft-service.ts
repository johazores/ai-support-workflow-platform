import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import { anthropicProvider } from "@/features/ai-drafts/services/anthropic-ai-provider";
import { AiProviderChain } from "@/features/ai-drafts/services/ai-provider-chain";
import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

type ProviderEntry = {
  name: string;
  model: string;
  provider: {
    generateDraft: (input: GenerateDraftInput) => Promise<{ draft: string }>;
  };
};

function buildProviderChain(): AiProviderChain {
  const providers: ProviderEntry[] = [];

  // Add configured providers in priority order
  if (process.env.AI_PROVIDER === "openai" || process.env.OPENAI_API_KEY) {
    providers.push({
      name: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      provider: openAiProvider,
    });
  }

  if (
    process.env.AI_PROVIDER === "anthropic" ||
    process.env.ANTHROPIC_API_KEY
  ) {
    providers.push({
      name: "anthropic",
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      provider: anthropicProvider,
    });
  }

  // Mock provider always available as final fallback
  providers.push({
    name: "mock",
    model: "mock-model",
    provider: mockAiProvider,
  });

  return new AiProviderChain(providers);
}

export async function generateAiDraftReply(input: GenerateDraftInput) {
  const chain = buildProviderChain();

  try {
    return await chain.generate(input);
  } catch {
    return {
      draft: `Hi ${input.customerName},

Thanks for your message regarding "${input.subject}".

We are currently reviewing your request and will get back to you shortly.

Kind regards,
Support Team`,
    };
  }
}
