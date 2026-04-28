"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendDraft } from "@/features/ai-drafts/services/ai-draft-client-service";

type SendDraftButtonProps = {
  draftId: string;
};

export function SendDraftButton({ draftId }: SendDraftButtonProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    if (!window.confirm("Send this draft as a reply?")) return;

    setIsSending(true);

    try {
      await sendDraft(draftId);
      router.refresh();
    } catch {
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
