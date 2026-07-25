import { anthropicProvider } from "@/features/ai-drafts/services/anthropic-ai-provider";
import { deepSeekProvider } from "@/features/ai-drafts/services/deepseek-ai-provider";
import { googleGeminiProvider } from "@/features/ai-drafts/services/google-gemini-ai-provider";
import { groqProvider } from "@/features/ai-drafts/services/groq-ai-provider";
import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import { openRouterProvider } from "@/features/ai-drafts/services/openrouter-ai-provider";
import { togetherAiProvider } from "@/features/ai-drafts/services/together-ai-provider";
import type { AiDraftProvider } from "@/features/ai-drafts/types/ai-provider";
import { listAiProviderRuntimePolicies } from "@/features/providers/services/provider-service";

type RuntimeRegistryEntry = {
  key: string;
  provider: AiDraftProvider;
  environmentCredentialKeys: string[];
  environmentModelKey?: string;
  defaultModel?: string;
};

export type AiProviderRuntimeEntry = {
  name: string;
  model: string;
  provider: AiDraftProvider;
};

const registry: RuntimeRegistryEntry[] = [
  {
    key: "openai",
    provider: openAiProvider,
    environmentCredentialKeys: ["OPENAI_API_KEY"],
    environmentModelKey: "OPENAI_MODEL",
    defaultModel: "gpt-4.1-mini",
  },
  {
    key: "anthropic",
    provider: anthropicProvider,
    environmentCredentialKeys: ["ANTHROPIC_API_KEY"],
    environmentModelKey: "ANTHROPIC_MODEL",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    key: "google-gemini",
    provider: googleGeminiProvider,
    environmentCredentialKeys: ["GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"],
    environmentModelKey: "GEMINI_MODEL",
    defaultModel: "gemini-3.6-flash",
  },
  {
    key: "openrouter",
    provider: openRouterProvider,
    environmentCredentialKeys: ["OPENROUTER_API_KEY"],
    environmentModelKey: "OPENROUTER_MODEL",
  },
  {
    key: "groq",
    provider: groqProvider,
    environmentCredentialKeys: ["GROQ_API_KEY"],
    environmentModelKey: "GROQ_MODEL",
    defaultModel: "openai/gpt-oss-20b",
  },
  {
    key: "together-ai",
    provider: togetherAiProvider,
    environmentCredentialKeys: ["TOGETHER_API_KEY"],
    environmentModelKey: "TOGETHER_MODEL",
  },
  {
    key: "deepseek",
    provider: deepSeekProvider,
    environmentCredentialKeys: ["DEEPSEEK_API_KEY"],
    environmentModelKey: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-v4-flash",
  },
];

function firstEnvironmentValue(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export async function resolveAiProviderRuntimeEntries(): Promise<
  AiProviderRuntimeEntry[]
> {
  const policies = await listAiProviderRuntimePolicies();
  const policyByKey = new Map(policies.map((policy) => [policy.key, policy]));

  const entries = registry.flatMap((definition, registryIndex) => {
    const policy = policyByKey.get(definition.key);
    const mode = policy?.mode ?? "environment";

    if (mode === "disabled") return [];
    if (
      mode === "environment" &&
      !firstEnvironmentValue(definition.environmentCredentialKeys)
    ) {
      return [];
    }

    const environmentModel = definition.environmentModelKey
      ? process.env[definition.environmentModelKey]?.trim()
      : undefined;

    return [
      {
        priority: policy?.priority ?? 100,
        registryIndex,
        entry: {
          name: definition.key,
          model:
            mode === "database"
              ? "database-configured"
              : environmentModel ||
                definition.defaultModel ||
                "environment-configured",
          provider: definition.provider,
        },
      },
    ];
  });

  entries.sort(
    (left, right) =>
      left.priority - right.priority || left.registryIndex - right.registryIndex,
  );

  const resolved = entries.map(({ entry }) => entry);
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_MOCK_AI === "true"
  ) {
    resolved.push({ name: "mock", model: "mock-model", provider: mockAiProvider });
  }

  return resolved;
}
