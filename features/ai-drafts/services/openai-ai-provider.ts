import OpenAI from "openai";
import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";

const toneInstructions: Record<string, string> = {
  professional: "Use a formal, business-appropriate tone.",
  friendly: "Use a warm, conversational tone while remaining helpful.",
  concise: "Be extremely brief and to the point. No filler.",
  empathetic: "Show understanding and empathy for the customer's situation.",
};

function buildPrompt(input: GenerateDraftInput) {
  const tone = input.tone ?? "professional";

  return `
Write a customer support reply.

Customer name: ${input.customerName}
Ticket subject: ${input.subject}
Customer message: ${input.customerMessage}

Tone: ${toneInstructions[tone] ?? toneInstructions.professional}

Rules:
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

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful customer support assistant. Write concise, professional replies.",
        },
        { role: "user", content: buildPrompt(input) },
      ],
    });

    const draft = response.choices[0]?.message?.content;

    if (!draft) {
      throw new Error("OpenAI returned an empty response");
    }

    return { draft };
  },
};
