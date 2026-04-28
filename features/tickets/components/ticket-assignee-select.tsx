"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { assignTicket } from "@/features/tickets/services/ticket-client-service";

const assignees = [
  { name: "Support Team", email: "support@example.com" },
  { name: "Billing Team", email: "billing@example.com" },
  { name: "Technical Team", email: "technical@example.com" },
];

type TicketAssigneeSelectProps = {
  ticketId: string;
  assigneeEmail?: string | null;
};

export function TicketAssigneeSelect({
  ticketId,
  assigneeEmail,
}: TicketAssigneeSelectProps) {
  const router = useRouter();
  const [currentAssigneeEmail, setCurrentAssigneeEmail] = useState(
    assigneeEmail ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  async function handleChange(nextAssigneeEmail: string) {
    const assignee = assignees.find((item) => item.email === nextAssigneeEmail);
    if (!assignee && nextAssigneeEmail !== "") return;

    setCurrentAssigneeEmail(nextAssigneeEmail);
    setIsSaving(true);

    try {
      await assignTicket(
        ticketId,
        assignee?.name ?? null,
        assignee?.email ?? null,
      );
      toast(assignee ? `Assigned to ${assignee.name}.` : "Unassigned.");
      router.refresh();
    } catch {
      setCurrentAssigneeEmail(assigneeEmail ?? "");
      toast("Failed to assign ticket.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Select
        label="Assignee"
        value={currentAssigneeEmail}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value)}
        fullWidth
      >
        <option value="">Unassigned</option>

        {assignees.map((assignee) => (
          <option key={assignee.email} value={assignee.email}>
            {assignee.name}
          </option>
        ))}
      </Select>

      {isSaving && (
        <p className="mt-2 text-xs text-slate-400 animate-pulse">Saving...</p>
      )}
    </div>
  );
}
