"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InternalNoteComposerProps = {
  ticketId: string;
};

export function InternalNoteComposer({ ticketId }: InternalNoteComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to add note");
      }

      setBody("");
      setMessage("Internal note added.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to add internal note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-amber-50 p-5 shadow-sm"
    >
      <h2 className="font-semibold text-slate-950">Internal Note</h2>

      <p className="mt-2 text-sm text-slate-600">
        Add a private note for the support team.
      </p>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={5}
        placeholder="Write an internal note..."
        className="mt-4 w-full rounded-xl border bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-slate-400"
      />

      <button
        type="submit"
        disabled={isSaving || !body.trim()}
        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Add Note"}
      </button>

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </form>
  );
}
