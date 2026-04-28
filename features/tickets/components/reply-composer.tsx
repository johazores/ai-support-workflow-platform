"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { sendReply } from "@/features/tickets/services/ticket-client-service";
import { MacroPicker } from "@/features/saved-replies/components/macro-picker";

type ReplyComposerProps = {
  ticketId: string;
};

export function ReplyComposer({ ticketId }: ReplyComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    setIsLoading(true);
    try {
      await sendReply(ticketId, body);
      toast("Reply sent successfully.");
      setBody("");
      router.refresh();
    } catch {
      toast("Failed to send reply. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Manual Reply</h2>
          <p className="mt-1 text-xs text-slate-500">
            Write and send a support reply without using AI.
          </p>
        </div>
        <MacroPicker onSelect={(text) => setBody(text)} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextArea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          placeholder="Write your reply..."
          fullWidth
        />

        <Button
          type="submit"
          fullWidth
          disabled={isLoading || !body.trim()}
          isLoading={isLoading}
        >
          Send Reply
        </Button>
      </form>
    </Card>
  );
}
