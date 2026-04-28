"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAsyncAction } from "@/lib/use-async-action";
import {
  fetchSavedReplies,
  createSavedReply,
  deleteSavedReply,
} from "@/features/saved-replies/services/saved-reply-client-service";

type SavedReply = {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
};

export function SavedReplyManager() {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [shortcut, setShortcut] = useState("");
  const { isLoading, message, messageType, execute, clearMessage } =
    useAsyncAction();

  useEffect(() => {
    loadReplies();
  }, []);

  async function loadReplies() {
    try {
      const data = await fetchSavedReplies();
      setReplies(data);
    } catch {
      // silently fail
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    const success = await execute(async () => {
      await createSavedReply({
        title,
        body,
        shortcut: shortcut || undefined,
      });
      return "Reply template created.";
    }, "Failed to create reply template.");

    if (success) {
      setTitle("");
      setBody("");
      setShortcut("");
      loadReplies();
    }
  }

  async function handleDelete(id: string) {
    await execute(async () => {
      await deleteSavedReply(id);
      setReplies((prev) => prev.filter((r) => r.id !== id));
      return "Reply template deleted.";
    }, "Failed to delete reply template.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">
          Create Reply Template
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Use {"{{customer.name}}"} and {"{{ticket.subject}}"} for variable
          interpolation.
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Password Reset Instructions"
            fullWidth
            required
          />

          <TextArea
            label="Reply Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {{customer.name}}, ..."
            fullWidth
            rows={4}
            required
          />

          <Input
            label="Shortcut (optional)"
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            placeholder="e.g., /reset"
            fullWidth
          />

          {messageType && (
            <Alert type={messageType} dismissible onDismiss={clearMessage}>
              {message}
            </Alert>
          )}

          <Button type="submit" isLoading={isLoading}>
            {isLoading ? "Creating..." : "Create Template"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {replies.length === 0 && (
          <p className="text-sm text-slate-400">No saved replies yet.</p>
        )}

        {replies.map((reply) => (
          <div
            key={reply.id}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">{reply.title}</h3>
                {reply.shortcut && (
                  <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                    {reply.shortcut}
                  </span>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {reply.body}
                </p>
              </div>

              <button
                onClick={() => handleDelete(reply.id)}
                className="shrink-0 text-xs font-medium text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
