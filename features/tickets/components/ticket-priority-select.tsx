"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";

const PRIORITIES = ["low", "normal", "high"] as const;

const priorityColors: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
  normal:
    "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
  low: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400",
};

export function TicketPrioritySelect({
  ticketId,
  currentPriority,
}: {
  ticketId: string;
  currentPriority: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const priority = e.target.value;
    if (priority === currentPriority) return;

    setUpdating(true);
    try {
      await apiClient(`/api/tickets/${ticketId}/priority`, {
        method: "PATCH",
        body: { priority },
      });
      toast(`Priority changed to ${priority}`);
      router.refresh();
    } catch {
      toast("Failed to update priority", "error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <select
      value={currentPriority}
      onChange={handleChange}
      disabled={updating}
      aria-label="Change priority"
      className={`cursor-pointer rounded-md border px-2 py-0.5 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-blue-100 ${
        priorityColors[currentPriority] ?? priorityColors.normal
      }`}
    >
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </option>
      ))}
    </select>
  );
}
