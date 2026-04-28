import { describe, it, expect } from "vitest";
import { mockAiProvider } from "@/features/ai-drafts/services/mock-ai-provider";

describe("mock-ai-provider", () => {
  it("generates a professional draft by default", async () => {
    const result = await mockAiProvider.generateDraft({
      subject: "Billing inquiry",
      customerName: "Alice",
      customerMessage: "I have a question about my invoice.",
    });

    expect(result.draft).toContain("Alice");
    expect(result.draft).toContain("Billing inquiry");
    expect(result.draft).toContain("Support Team");
  });

  it("generates a friendly draft when tone is friendly", async () => {
    const result = await mockAiProvider.generateDraft({
      subject: "Help needed",
      customerName: "Bob",
      customerMessage: "Can you help me?",
      tone: "friendly",
    });

    expect(result.draft).toContain("Bob");
    expect(result.draft).toContain("Support Team");
  });

  it("generates a concise draft when tone is concise", async () => {
    const result = await mockAiProvider.generateDraft({
      subject: "Quick question",
      customerName: "Charlie",
      customerMessage: "What's the status?",
      tone: "concise",
    });

    expect(result.draft).toContain("Charlie");
    // Concise drafts should be shorter
    expect(result.draft.length).toBeLessThan(200);
  });

  it("generates an empathetic draft when tone is empathetic", async () => {
    const result = await mockAiProvider.generateDraft({
      subject: "Service issue",
      customerName: "Diana",
      customerMessage: "This is really frustrating.",
      tone: "empathetic",
    });

    expect(result.draft).toContain("Diana");
    expect(result.draft.toLowerCase()).toContain("understand");
  });

  it("falls back to professional for unknown tone", async () => {
    const result = await mockAiProvider.generateDraft({
      subject: "Test",
      customerName: "Eve",
      customerMessage: "Test message.",
      tone: "unknown-tone" as never,
    });

    expect(result.draft).toContain("Eve");
    expect(result.draft).toContain("Support Team");
  });
});
