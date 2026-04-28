"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import {
  generateDraft,
  saveDraft,
} from "@/features/ai-drafts/services/ai-draft-client-service";

type Tone = "professional" | "friendly" | "concise" | "empathetic";

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
  const [tone, setTone] = useState<Tone>("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  function clearMessage() {
    setMessage("");
    setMessageType(null);
  }

  async function handleGenerateDraft() {
    setIsGenerating(true);
    clearMessage();

    try {
      const result = await generateDraft({
        subject,
        customerName,
        customerMessage,
        tone,
      });

      setDraft(result);
      setMessage("Draft generated successfully.");
      setMessageType("success");
    } catch {
      setMessage("Failed to generate draft. Please try again.");
      setMessageType("error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft.trim()) return;

    setIsSaving(true);
    clearMessage();

    try {
      await saveDraft(ticketId, draft);
      setMessage("Draft saved successfully.");
      setMessageType("success");
    } catch {
      setMessage("Failed to save draft. Please try again.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-950">AI Draft</h2>
        <p className="mt-1 text-xs text-slate-500">
          Generate, edit, and save a suggested support reply.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Tone
          </label>
          <Select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="concise">Concise</option>
            <option value="empathetic">Empathetic</option>
          </Select>
        </div>

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
          <Alert type={messageType} dismissible onDismiss={clearMessage}>
            {message}
          </Alert>
        )}
      </div>
    </Card>
  );
}
