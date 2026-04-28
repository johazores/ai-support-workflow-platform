"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { addInternalNote } from "@/features/tickets/services/ticket-client-service";
import { MentionInput } from "@/features/tickets/components/mention-input";

type InternalNoteComposerProps = {
  ticketId: string;
};

export function InternalNoteComposer({ ticketId }: InternalNoteComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    setIsLoading(true);
    try {
      await addInternalNote(ticketId, body);
      toast("Internal note added.");
      setBody("");
      router.refresh();
    } catch {
      toast("Failed to add note. Please try again.", "error");
    } finally {
      setIsLoading(false);
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
        <MentionInput
          value={body}
          onChange={setBody}
          rows={5}
          placeholder="Write an internal note... use @ to mention teammates"
          aria-label="Internal note"
        />

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
