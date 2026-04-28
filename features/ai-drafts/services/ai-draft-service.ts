import { prisma } from "@/lib/prisma";
import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import type { GenerateDraftInput } from "@/features/ai-drafts/types/ai-provider";

function getAiProvider() {
  if (process.env.AI_PROVIDER === "openai") {
    return {
      name: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      provider: openAiProvider,
    };
  }

  return {
    name: "mock",
    model: "mock-model",
    provider: mockAiProvider,
  };
}

export async function generateAiDraftReply(input: GenerateDraftInput) {
  const { name, model, provider } = getAiProvider();

  try {
    const result = await provider.generateDraft(input);

    await prisma.aiUsageLog.create({
      data: {
        provider: name,
        model,
        success: true,
      },
    });

    return result;
  } catch (error: any) {
    await prisma.aiUsageLog.create({
      data: {
        provider: name,
        model,
        success: false,
        error: error?.message ?? "Unknown error",
      },
    });

    return {
      draft: `Hi ${input.customerName},

Thanks for your message regarding "${input.subject}".

We are currently reviewing your request and will get back to you shortly.

Kind regards,
Support Team`,
    };
  }
}
