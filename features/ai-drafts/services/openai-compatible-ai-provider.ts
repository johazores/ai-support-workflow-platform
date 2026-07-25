import OpenAI from "openai";
import {
  aiDraftSystemPrompt,
  buildAiDraftPrompt,
} from "@/features/ai-drafts/services/ai-draft-prompt";
import type {
  AiDraftProvider,
  GenerateDraftInput,
} from "@/features/ai-drafts/types/ai-provider";
import { getProviderRuntimeConfiguration } from "@/features/providers/services/provider-service";

type ProviderConfiguration = Record<string, unknown>;

type OpenAiCompatibleProviderOptions = {
  key: string;
  displayName: string;
  envApiKeys: string[];
  envModel?: string;
  defaultBaseUrl: string;
  defaultModel?: string;
  defaultHeaders?: (
    configuration: ProviderConfiguration | null,
  ) => Record<string, string> | undefined;
};

function asConfiguration(value: unknown): ProviderConfiguration | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ProviderConfiguration)
    : null;
}

function firstEnvironmentValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function createOpenAiCompatibleProvider(
  options: OpenAiCompatibleProviderOptions,
): AiDraftProvider {
  return {
    async generateDraft(input: GenerateDraftInput) {
      const runtime = await getProviderRuntimeConfiguration(options.key);
      if (runtime.mode === "disabled") {
        throw new Error(`${options.displayName} is disabled`);
      }

      const database = runtime.mode === "database" ? runtime : null;
      const apiKey =
        database?.credential ?? firstEnvironmentValue(options.envApiKeys);

      if (!apiKey) {
        throw new Error(`${options.displayName} is not configured`);
      }

      const model =
        database?.defaultModel ||
        (options.envModel ? process.env[options.envModel]?.trim() : undefined) ||
        options.defaultModel;

      if (!model) {
        throw new Error(`${options.displayName} model is not configured`);
      }

      const configuration = asConfiguration(database?.configuration);
      const client = new OpenAI({
        apiKey,
        baseURL: database?.baseUrl || options.defaultBaseUrl,
        defaultHeaders: options.defaultHeaders?.(configuration),
      });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: aiDraftSystemPrompt },
          { role: "user", content: buildAiDraftPrompt(input) },
        ],
      });

      const draft = response.choices[0]?.message?.content?.trim();
      if (!draft) {
        throw new Error(`${options.displayName} returned an empty response`);
      }

      return { draft, model };
    },
  };
}

export function buildOpenRouterHeaders(
  configuration: ProviderConfiguration | null,
) {
  if (!configuration) return undefined;

  const headers: Record<string, string> = {};
  const httpReferer = configuration.httpReferer;
  const appTitle = configuration.appTitle;

  if (typeof httpReferer === "string" && httpReferer.trim()) {
    headers["HTTP-Referer"] = httpReferer.trim();
  }
  if (typeof appTitle === "string" && appTitle.trim()) {
    headers["X-Title"] = appTitle.trim();
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}
