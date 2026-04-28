"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

type ReplyComposerProps = {
  ticketId: string;
};

export function ReplyComposer({ ticketId }: ReplyComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) return;

    setIsSending(true);
    setMessage("");
    setMessageType(null);

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
      setMessage("Reply sent successfully.");
      setMessageType("success");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to send reply. Please try again.");
      setMessageType("error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-950">Manual Reply</h2>
        <p className="mt-2 text-sm text-slate-600">
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
          <Alert
            type={messageType}
            dismissible
            onDismiss={() => {
              setMessage("");
              setMessageType(null);
            }}
          >
            {message}
          </Alert>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={isSending || !body.trim()}
          isLoading={isSending}
        >
          Send Reply
        </Button>
      </form>
    </Card>
  );
}
