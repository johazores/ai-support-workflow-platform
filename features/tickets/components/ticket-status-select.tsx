"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import { updateTicketStatus } from "@/features/tickets/services/ticket-client-service";

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
  const { toast } = useToast();

  async function handleChange(nextStatus: TicketStatus) {
    setCurrentStatus(nextStatus);
    setIsSaving(true);

    try {
      await updateTicketStatus(ticketId, nextStatus);
      toast(`Status changed to ${nextStatus}.`);
      router.refresh();
    } catch {
      setCurrentStatus(status);
      toast("Failed to update status.", "error");
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

      {isSaving && (
        <p className="mt-2 text-xs text-slate-400 animate-pulse">Saving...</p>
      )}
    </div>
  );
}
