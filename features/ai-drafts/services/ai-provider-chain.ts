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

async function recordProviderUsage(input: {
  request: GenerateDraftInput;
  entry: ProviderEntry;
  startedAt: number;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await prisma.aiUsageLog.create({
      data: {
        organizationId: input.request.organizationId,
        provider: input.entry.name,
        model: input.entry.model,
        success: input.success,
        error: input.errorMessage,
      },
    });

    const provider = await prisma.provider.findUnique({
      where: { key: input.entry.name },
    });

    if (!provider) return;

    await prisma.providerUsageRecord.create({
      data: {
        organizationId: input.request.organizationId,
        providerId: provider.id,
        operation: "ai.draft.generate",
        model: input.entry.model,
        latencyMs: Date.now() - input.startedAt,
        success: input.success,
        errorCode: input.errorMessage?.slice(0, 200),
      },
    });
  } catch (error: unknown) {
    console.error(
      `Failed to record AI provider usage for ${input.entry.name}:`,
      getErrorMessage(error),
    );
  }
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

        await recordProviderUsage({
          request: input,
          entry,
          startedAt,
          success: true,
        });

        return result;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage = getErrorMessage(error);

        await recordProviderUsage({
          request: input,
          entry,
          startedAt,
          success: false,
          errorMessage,
        });

        console.error(
          `AI provider ${entry.name} failed, trying next:`,
          errorMessage,
        );
      }
    }

    throw lastError ?? new Error("All AI providers failed");
  }
}
