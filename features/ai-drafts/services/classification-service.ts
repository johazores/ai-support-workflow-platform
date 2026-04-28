import type { AiDraftProvider } from "@/features/ai-drafts/types/ai-provider";
import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";
import { openAiProvider } from "@/features/ai-drafts/services/openai-ai-provider";
import { prisma } from "@/lib/prisma";

type Classification = {
  priority: "urgent" | "high" | "normal" | "low";
  category: string;
};

const validPriorities = ["urgent", "high", "normal", "low"] as const;

function getProvider(): { name: string; provider: AiDraftProvider } {
  if (process.env.AI_PROVIDER === "openai") {
    return { name: "openai", provider: openAiProvider };
  }
  return { name: "mock", provider: mockAiProvider };
}

function classifyByKeywords(subject: string, body: string): Classification {
  const text = `${subject} ${body}`.toLowerCase();

  if (
    text.includes("urgent") ||
    text.includes("emergency") ||
    text.includes("down") ||
    text.includes("outage")
  ) {
    return { priority: "urgent", category: "incident" };
  }

  if (
    text.includes("billing") ||
    text.includes("invoice") ||
    text.includes("charge") ||
    text.includes("refund")
  ) {
    return { priority: "high", category: "billing" };
  }

  if (
    text.includes("bug") ||
    text.includes("error") ||
    text.includes("broken") ||
    text.includes("not working")
  ) {
    return { priority: "high", category: "bug-report" };
  }

  if (
    text.includes("how to") ||
    text.includes("help") ||
    text.includes("question")
  ) {
    return { priority: "normal", category: "question" };
  }

  if (
    text.includes("feature") ||
    text.includes("request") ||
    text.includes("suggestion")
  ) {
    return { priority: "low", category: "feature-request" };
  }

  return { priority: "normal", category: "general" };
}

export async function classifyTicket(
  ticketId: string,
  subject: string,
  body: string,
): Promise<Classification> {
  const { name, provider } = getProvider();

  // If OpenAI is configured, try AI classification
  if (name === "openai") {
    try {
      const result = await provider.generateDraft({
        subject,
        customerName: "",
        customerMessage: `Classify this support ticket. Respond with ONLY a JSON object like {"priority":"normal","category":"general"}.

Priorities: urgent, high, normal, low
Categories: incident, billing, bug-report, question, feature-request, general

Subject: ${subject}
Message: ${body}`,
      });

      const parsed = JSON.parse(result.draft) as Record<string, unknown>;

      if (
        typeof parsed.priority === "string" &&
        validPriorities.includes(
          parsed.priority as (typeof validPriorities)[number],
        ) &&
        typeof parsed.category === "string"
      ) {
        return parsed as unknown as Classification;
      }
    } catch {
      // Fall through to keyword-based classification
    }
  }

  // Keyword-based fallback (always available, no API call)
  const classification = classifyByKeywords(subject, body);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority: classification.priority },
  });

  return classification;
}
