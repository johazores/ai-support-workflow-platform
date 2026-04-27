"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SendDraftButtonProps = {
  draftId: string;
};

export function SendDraftButton({ draftId }: SendDraftButtonProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    const confirmed = window.confirm("Send this draft as a reply?");

    if (!confirmed) return;

    setIsSending(true);

    try {
      const response = await fetch(`/api/ai-drafts/${draftId}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send draft");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to send draft.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={isSending}
      className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
    >
      {isSending ? "Sending..." : "Send Reply"}
    </button>
  );
}
