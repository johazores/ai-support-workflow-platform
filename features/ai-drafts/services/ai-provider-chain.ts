import type {
  AiDraftProvider,
  GenerateDraftInput,
  GenerateDraftResult,
} from "@/features/ai-drafts/types/ai-provider";
import { prisma } from "@/lib/prisma";

type ProviderEntry = {
  name: string;
  model: string;
  provider: AiDraftProvider;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class AiProviderChain {
  private providers: ProviderEntry[];

  constructor(providers: ProviderEntry[]) {
    this.providers = providers;
  }

  async generate(input: GenerateDraftInput): Promise<GenerateDraftResult> {
    let lastError: unknown;

    for (const entry of this.providers) {
      const startedAt = Date.now();
      try {
        const result = await entry.provider.generateDraft(input);

        await prisma.aiUsageLog.create({
          data: {
            organizationId: input.organizationId,
            provider: entry.name,
            model: entry.model,
            success: true,
          },
        });

        const provider = await prisma.provider.findUnique({
          where: { key: entry.name },
        });
        if (provider) {
          await prisma.providerUsageRecord.create({
            data: {
              organizationId: input.organizationId,
              providerId: provider.id,
              operation: "ai.draft.generate",
              model: entry.model,
              latencyMs: Date.now() - startedAt,
              success: true,
            },
          });
        }

        return result;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage = getErrorMessage(error);

        await prisma.aiUsageLog.create({
          data: {
            organizationId: input.organizationId,
            provider: entry.name,
            model: entry.model,
            success: false,
            error: errorMessage,
          },
        });

        const provider = await prisma.provider.findUnique({
          where: { key: entry.name },
        });
        if (provider) {
          await prisma.providerUsageRecord.create({
            data: {
              organizationId: input.organizationId,
              providerId: provider.id,
              operation: "ai.draft.generate",
              model: entry.model,
              latencyMs: Date.now() - startedAt,
              success: false,
              errorCode: errorMessage.slice(0, 200),
            },
          });
        }

        console.error(
          `AI provider ${entry.name} failed, trying next:`,
          errorMessage,
        );
      }
    }

    throw lastError ?? new Error("All AI providers failed");
  }
}
