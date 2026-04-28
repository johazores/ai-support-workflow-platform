"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

type InternalNoteComposerProps = {
  ticketId: string;
};

export function InternalNoteComposer({ ticketId }: InternalNoteComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) return;

    setIsSaving(true);
    setMessage("");
    setMessageType(null);

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
      setMessage("Internal note added successfully.");
      setMessageType("success");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to add internal note. Please try again.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="bg-amber-50/60 ring-amber-100">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-amber-900">Internal Note</h2>
        <p className="mt-1 text-xs text-amber-700">
          Add a private note for the support team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextArea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder="Write an internal note..."
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
          disabled={isSaving || !body.trim()}
          isLoading={isSaving}
        >
          Add Note
        </Button>
      </form>
    </Card>
  );
}
