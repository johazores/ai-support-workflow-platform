"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const assignees = [
  {
    name: "Support Team",
    email: "support@example.com",
  },
  {
    name: "Billing Team",
    email: "billing@example.com",
  },
  {
    name: "Technical Team",
    email: "technical@example.com",
  },
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

  async function handleChange(nextAssigneeEmail: string) {
    const assignee = assignees.find((item) => item.email === nextAssigneeEmail);

    if (!assignee) return;

    setCurrentAssigneeEmail(nextAssigneeEmail);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeName: assignee.name,
          assigneeEmail: assignee.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign ticket");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setCurrentAssigneeEmail(assigneeEmail ?? "");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Assignee</label>

      <select
        value={currentAssigneeEmail}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value)}
        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
      >
        <option value="">Unassigned</option>

        {assignees.map((assignee) => (
          <option key={assignee.email} value={assignee.email}>
            {assignee.name}
          </option>
        ))}
      </select>

      {isSaving && <p className="mt-2 text-xs text-slate-400">Saving...</p>}
    </div>
  );
}
