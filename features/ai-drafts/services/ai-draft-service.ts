import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

export async function generateAiDraftReply(input: GenerateDraftInput) {
  return mockAiProvider.generateDraft(input);
}
