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
import { systemSettingKeys } from "@/features/system-settings/services/system-setting-keys";
import { getBooleanSystemSetting } from "@/features/system-settings/services/system-setting-service";

type RuntimeRegistryEntry = {
  key: string;
  provider: AiDraftProvider;
};

export type AiProviderRuntimeEntry = {
  name: string;
  model: string;
  provider: AiDraftProvider;
};

const registry: RuntimeRegistryEntry[] = [
  { key: "openai", provider: openAiProvider },
  { key: "anthropic", provider: anthropicProvider },
  { key: "google-gemini", provider: googleGeminiProvider },
  { key: "openrouter", provider: openRouterProvider },
  { key: "groq", provider: groqProvider },
  { key: "together-ai", provider: togetherAiProvider },
  { key: "deepseek", provider: deepSeekProvider },
];

export async function resolveAiProviderRuntimeEntries(): Promise<
  AiProviderRuntimeEntry[]
> {
  const policies = await listAiProviderRuntimePolicies();
  const policyByKey = new Map(policies.map((policy) => [policy.key, policy]));

  const entries = registry.flatMap((definition, registryIndex) => {
    const policy = policyByKey.get(definition.key);
    if (!policy || policy.mode !== "database") return [];

    return [
      {
        priority: policy.priority,
        registryIndex,
        entry: {
          name: definition.key,
          model: "database-configured",
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
  const allowMock =
    process.env.NODE_ENV !== "production" &&
    (await getBooleanSystemSetting(systemSettingKeys.allowMockAi, false));

  if (allowMock) {
    resolved.push({ name: "mock", model: "mock-model", provider: mockAiProvider });
  }

  return resolved;
}
