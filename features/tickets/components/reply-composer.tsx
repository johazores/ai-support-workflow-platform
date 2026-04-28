"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAsyncAction } from "@/lib/use-async-action";
import { sendReply } from "@/features/tickets/services/ticket-client-service";

type ReplyComposerProps = {
  ticketId: string;
};

export function ReplyComposer({ ticketId }: ReplyComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const { isLoading, message, messageType, execute, clearMessage } =
    useAsyncAction();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    const success = await execute(async () => {
      await sendReply(ticketId, body);
      return "Reply sent successfully.";
    }, "Failed to send reply. Please try again.");

    if (success) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-950">Manual Reply</h2>
        <p className="mt-1 text-xs text-slate-500">
          Write and send a support reply without using AI.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextArea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          placeholder="Write your reply..."
          fullWidth
        />

        {messageType && (
          <Alert type={messageType} dismissible onDismiss={clearMessage}>
            {message}
          </Alert>
        )}

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
