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
      try {
        const result = await entry.provider.generateDraft(input);

        await prisma.aiUsageLog.create({
          data: {
            provider: entry.name,
            model: entry.model,
            success: true,
          },
        });

        return result;
      } catch (error: unknown) {
        lastError = error;

        await prisma.aiUsageLog.create({
          data: {
            provider: entry.name,
            model: entry.model,
            success: false,
            error: getErrorMessage(error),
          },
        });

        console.error(
          `AI provider ${entry.name} failed, trying next:`,
          getErrorMessage(error),
        );
      }
    }

    throw lastError ?? new Error("All AI providers failed");
  }
}
