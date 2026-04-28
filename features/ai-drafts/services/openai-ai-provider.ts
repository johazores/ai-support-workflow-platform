import OpenAI from "openai";
import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";

function buildPrompt(input: GenerateDraftInput) {
  return `
Write a concise and helpful customer support reply.

Customer name: ${input.customerName}
Ticket subject: ${input.subject}
Customer message: ${input.customerMessage}

Rules:
- Be professional and clear.
- Do not overpromise.
- Keep it short.
- Sign as Support Team.
`;
}

export const openAiProvider: AiDraftProvider = {
  async generateDraft(input: GenerateDraftInput) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: buildPrompt(input),
    });

    return {
      draft: response.output_text,
    };
  },
};
