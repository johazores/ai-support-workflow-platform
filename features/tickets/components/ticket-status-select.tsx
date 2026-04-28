"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import type { TicketStatus } from "@/features/tickets/types/ticket";

type TicketStatusSelectProps = {
  ticketId: string;
  status: TicketStatus;
};

export function TicketStatusSelect({
  ticketId,
  status,
}: TicketStatusSelectProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(nextStatus: TicketStatus) {
    setCurrentStatus(nextStatus);
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setCurrentStatus(status);
      setError("Failed to update status. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Select
        label="Status"
        value={currentStatus}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value as TicketStatus)}
        fullWidth
      >
        <option value="open">Open</option>
        <option value="pending">Pending</option>
        <option value="closed">Closed</option>
      </Select>

      {error && (
        <Alert
          type="error"
          dismissible
          onDismiss={() => setError("")}
          className="mt-3"
        >
          {error}
        </Alert>
      )}

      {isSaving && (
        <p className="mt-2 text-xs text-slate-400 animate-pulse">Saving...</p>
      )}
    </div>
  );
}
