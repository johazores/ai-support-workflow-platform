"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

type AiDraftPanelProps = {
  ticketId: string;
  subject: string;
  customerName: string;
  customerMessage: string;
};

export function AiDraftPanel({
  ticketId,
  subject,
  customerName,
  customerMessage,
}: AiDraftPanelProps) {
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch("/api/ai-drafts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          customerName,
          customerMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to generate draft");
      }

      setDraft(result.data.draft);
      setMessage("Draft generated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error(error);
      setMessage("Failed to generate draft. Please try again.");
      setMessageType("error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft.trim()) return;

    setIsSaving(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch("/api/ai-drafts/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          body: draft,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to save draft");
      }

      setMessage("Draft saved successfully.");
      setMessageType("success");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save draft. Please try again.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-950">AI Draft</h2>
        <p className="mt-2 text-sm text-slate-600">
          Generate, edit, and save a suggested support reply.
        </p>
      </div>

      <div className="space-y-4">
        <Button
          fullWidth
          disabled={isGenerating}
          isLoading={isGenerating}
          onClick={handleGenerateDraft}
        >
          Generate Draft
        </Button>

        {draft && (
          <>
            <TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={10}
              fullWidth
            />

            <Button
              variant="secondary"
              fullWidth
              disabled={isSaving}
              isLoading={isSaving}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
          </>
        )}

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
      </div>
    </Card>
  );
}
