import { AiProviderChain } from "@/features/ai-drafts/services/ai-provider-chain";
import { resolveAiProviderRuntimeEntries } from "@/features/ai-drafts/services/ai-provider-runtime";
import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

export async function generateAiDraftReply(input: GenerateDraftInput) {
  const providers = await resolveAiProviderRuntimeEntries();
  if (providers.length === 0) {
    throw new Error("No AI providers are configured");
  }

  return new AiProviderChain(providers).generate(input);
}
