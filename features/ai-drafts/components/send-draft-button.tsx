"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { sendDraft } from "@/features/ai-drafts/services/ai-draft-client-service";

type SendDraftButtonProps = {
  draftId: string;
};

export function SendDraftButton({ draftId }: SendDraftButtonProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const { toast } = useToast();

  async function handleSend() {
    setIsSending(true);

    try {
      await sendDraft(draftId);
      toast("Draft sent as reply.");
      router.refresh();
    } catch {
      toast("Failed to send draft. Please try again.", "error");
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
