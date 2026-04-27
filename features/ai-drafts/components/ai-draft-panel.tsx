"use client";

import { useState } from "react";

type AiDraftPanelProps = {
  subject: string;
  customerName: string;
  customerMessage: string;
};

export function AiDraftPanel({
  subject,
  customerName,
  customerMessage,
}: AiDraftPanelProps) {
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateDraft() {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai-drafts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          customerName,
          customerMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to generate draft");
      }

      setDraft(result.data.draft);
    } catch (error) {
      console.error(error);
      setDraft("Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <aside className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950">AI Draft</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Generate a suggested reply using the customer message and ticket
        context.
      </p>

      <button
        type="button"
        onClick={handleGenerateDraft}
        disabled={isGenerating}
        className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : "Generate Draft"}
      </button>

      {draft && (
        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {draft}
          </p>
        </div>
      )}
    </aside>
  );
}
