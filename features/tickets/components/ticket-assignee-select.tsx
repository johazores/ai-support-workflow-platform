"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

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
  const [error, setError] = useState("");

  async function handleChange(nextAssigneeEmail: string) {
    const assignee = assignees.find((item) => item.email === nextAssigneeEmail);

    if (!assignee && nextAssigneeEmail !== "") return;

    setCurrentAssigneeEmail(nextAssigneeEmail);
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeName: assignee?.name ?? null,
          assigneeEmail: assignee?.email ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign ticket");
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setCurrentAssigneeEmail(assigneeEmail ?? "");
      setError("Failed to assign ticket. Please try again.");
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
