"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      alert("Failed to send draft. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button size="sm" onClick={handleSend} isLoading={isSending}>
      Send Reply
    </Button>
  );
}
