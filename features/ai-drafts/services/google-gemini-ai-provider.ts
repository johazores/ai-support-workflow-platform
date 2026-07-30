import {
  aiDraftSystemPrompt,
  buildAiDraftPrompt,
} from "@/features/ai-drafts/services/ai-draft-prompt";
import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";
import { getProviderRuntimeConfiguration } from "@/features/providers/services/provider-service";

function normalizeModel(model: string) {
  return model.replace(/^models\//, "");
}

export const googleGeminiProvider: AiDraftProvider = {
  async generateDraft(input: GenerateDraftInput) {
    const runtime = await getProviderRuntimeConfiguration("google-gemini");
    if (runtime.mode === "disabled") {
      throw new Error("Google Gemini is disabled");
    }

    if (!runtime.credential) {
      throw new Error("Google Gemini is not configured");
    }
    if (!runtime.defaultModel) {
      throw new Error("Google Gemini model is not configured");
    }

    const model = normalizeModel(runtime.defaultModel);
    const baseUrl =
      runtime.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${baseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(runtime.credential)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: aiDraftSystemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildAiDraftPrompt(input) }],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `Google Gemini API request failed with HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const draft = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join("\n")
      .trim();

    if (!draft) {
      throw new Error("Google Gemini returned an empty response");
    }

    return { draft, model };
  },
};
