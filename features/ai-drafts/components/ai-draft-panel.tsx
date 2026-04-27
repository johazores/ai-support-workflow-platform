"use client";
import { useState } from "react";

type AiDraftPanelProps = {
  ticketId: string;
  subject: string;
  customerName: string;
  customerMessage: string;
};

export function AiDraftPanel({
  ticketId,
  subject,
  customerName,
  customerMessage,
}: AiDraftPanelProps) {
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setMessage("");

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
      setMessage("Failed to generate draft.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft.trim()) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai-drafts/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          body: draft,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to save draft");
      }

      setMessage("Draft saved.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950">AI Draft</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Generate, edit, and save a suggested support reply.
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
        <div className="mt-4 space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={10}
            className="w-full rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-slate-400"
          />

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
    </aside>
  );
}
