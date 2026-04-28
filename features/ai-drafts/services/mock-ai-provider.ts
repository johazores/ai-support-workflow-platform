import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";

const mockReplies: Record<string, (input: GenerateDraftInput) => string> = {
  professional: (input) =>
    `Dear ${input.customerName},\n\nThank you for contacting us regarding "${input.subject}".\n\nWe have received your request and will review it promptly. A member of our team will follow up with the next steps.\n\nBest regards,\nSupport Team`,
  friendly: (input) =>
    `Hey ${input.customerName}! 👋\n\nThanks for reaching out about "${input.subject}".\n\nI'm looking into this for you and will get back to you soon with an update.\n\nCheers,\nSupport Team`,
  concise: (input) =>
    `Hi ${input.customerName},\n\nRe: ${input.subject} — received. We'll follow up shortly.\n\nSupport Team`,
  empathetic: (input) =>
    `Hi ${input.customerName},\n\nI completely understand how frustrating this must be regarding "${input.subject}". I want you to know we take this seriously.\n\nI'm personally looking into this and will make sure we get it resolved for you.\n\nWarm regards,\nSupport Team`,
};

export const mockAiProvider: AiDraftProvider = {
  async generateDraft(input: GenerateDraftInput) {
    const tone = input.tone ?? "professional";
    const generator = mockReplies[tone] ?? mockReplies.professional;

    return { draft: generator(input) };
  },
};
