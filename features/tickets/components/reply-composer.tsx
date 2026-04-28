"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReplyComposerProps = {
  ticketId: string;
};

export function ReplyComposer({ ticketId }: ReplyComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) return;

    setIsSending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/tickets/${ticketId}/reply`, {
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
        throw new Error(result.message ?? "Failed to send reply");
      }

      setBody("");
      setMessage("Reply sent.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to send reply.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold text-slate-950">Manual Reply</h2>

      <p className="mt-2 text-sm text-slate-500">
        Write and send a support reply without using AI.
      </p>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={6}
        placeholder="Write your reply..."
        className="mt-4 w-full rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-slate-400"
      />

      <button
        type="submit"
        disabled={isSending || !body.trim()}
        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSending ? "Sending..." : "Send Reply"}
      </button>

      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
    </form>
  );
}
