"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAsyncAction } from "@/lib/use-async-action";
import { addInternalNote } from "@/features/tickets/services/ticket-client-service";

type InternalNoteComposerProps = {
  ticketId: string;
};

export function InternalNoteComposer({ ticketId }: InternalNoteComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const { isLoading, message, messageType, execute, clearMessage } =
    useAsyncAction();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    const success = await execute(async () => {
      await addInternalNote(ticketId, body);
      return "Internal note added successfully.";
    }, "Failed to add internal note. Please try again.");

    if (success) {
      setBody("");
      router.refresh();
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
          Add Note
        </Button>
      </form>
    </Card>
  );
}
