"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  async function handleChange(nextStatus: TicketStatus) {
    setCurrentStatus(nextStatus);
    setIsSaving(true);

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
    } catch (error) {
      console.error(error);
      setCurrentStatus(status);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Status</label>

      <select
        value={currentStatus}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value as TicketStatus)}
        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
      >
        <option value="open">Open</option>
        <option value="pending">Pending</option>
        <option value="closed">Closed</option>
      </select>

      {isSaving && <p className="mt-2 text-xs text-slate-400">Saving...</p>}
    </div>
  );
}
