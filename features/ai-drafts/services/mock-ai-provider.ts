import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";

export const mockAiProvider: AiDraftProvider = {
  async generateDraft(input: GenerateDraftInput) {
    return {
      draft: `Hi ${input.customerName},

Thanks for reaching out about "${input.subject}".

I understand your concern. I will review the details and get back to you with the next steps shortly.

Kind regards,
Support Team`,
    };
  },
};
