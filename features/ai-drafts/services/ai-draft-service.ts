import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

function getAiProvider() {
  if (process.env.AI_PROVIDER === "openai") {
    return openAiProvider;
  }

  return mockAiProvider;
}

export async function generateAiDraftReply(input: GenerateDraftInput) {
  const provider = getAiProvider();

  return provider.generateDraft(input);
}
