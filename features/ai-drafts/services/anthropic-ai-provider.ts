import {
  aiDraftSystemPrompt,
  buildAiDraftPrompt,
} from "@/features/ai-drafts/services/ai-draft-prompt";
import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";
import { getProviderRuntimeConfiguration } from "@/features/providers/services/provider-service";

export const anthropicProvider: AiDraftProvider = {
  async generateDraft(input: GenerateDraftInput) {
    const runtime = await getProviderRuntimeConfiguration("anthropic");
    if (runtime.mode === "disabled") {
      throw new Error("Anthropic is disabled");
    }

    if (!runtime.credential) {
      throw new Error("Anthropic is not configured");
    }
    if (!runtime.defaultModel) {
      throw new Error("Anthropic model is not configured");
    }

    const baseUrl = runtime.baseUrl || "https://api.anthropic.com/v1";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": runtime.credential,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: runtime.defaultModel,
        max_tokens: 1024,
        system: aiDraftSystemPrompt,
        messages: [{ role: "user", content: buildAiDraftPrompt(input) }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic API request failed with HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const draft = data.content.find((block) => block.type === "text")?.text?.trim();

    if (!draft) throw new Error("Anthropic returned an empty response");
    return { draft, model: runtime.defaultModel };
  },
};
