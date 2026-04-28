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

function buildPrompt(input: GenerateDraftInput): string {
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

/**
 * Anthropic provider stub.
 * Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY to activate.
 * Uses the Messages API with Claude models.
 */
export const anthropicProvider: AiDraftProvider = {
  async generateDraft(input: GenerateDraftInput) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system:
          "You are a helpful customer support assistant. Write concise, professional replies.",
        messages: [{ role: "user", content: buildPrompt(input) }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const draft = data.content.find((b) => b.type === "text")?.text;

    if (!draft) {
      throw new Error("Anthropic returned an empty response");
    }

    return { draft };
  },
};
