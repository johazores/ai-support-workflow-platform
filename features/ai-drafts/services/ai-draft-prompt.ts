import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

const toneInstructions: Record<string, string> = {
  professional: "Use a formal, business-appropriate tone.",
  friendly: "Use a warm, conversational tone while remaining helpful.",
  concise: "Be extremely brief and to the point. No filler.",
  empathetic: "Show understanding and empathy for the customer's situation.",
};

export const aiDraftSystemPrompt =
  "You are a helpful customer support assistant. Write concise, professional replies.";

export function buildAiDraftPrompt(input: GenerateDraftInput) {
  const tone = input.tone ?? "professional";

  return `Write a customer support reply.

Customer name: ${input.customerName}
Ticket subject: ${input.subject}
Customer message: ${input.customerMessage}

Tone: ${toneInstructions[tone] ?? toneInstructions.professional}

Rules:
- Do not overpromise.
- Keep it short.
- Sign as Support Team.`;
}
