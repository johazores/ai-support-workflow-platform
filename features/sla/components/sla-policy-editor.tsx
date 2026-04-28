"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  fetchSlaPolicies,
  updateSlaPolicy,
} from "@/features/sla/services/sla-client-service";

type SlaPolicy = {
  id: string;
  name: string;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
};

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function SlaPolicyEditor() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstResponse, setFirstResponse] = useState("");
  const [resolution, setResolution] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSlaPolicies()
      .then(setPolicies)
      .catch(() => toast("Failed to load SLA policies", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  function startEdit(policy: SlaPolicy) {
    setEditingId(policy.id);
    setFirstResponse(String(policy.firstResponseMinutes));
    setResolution(String(policy.resolutionMinutes));
  }

  function cancelEdit() {
    setEditingId(null);
    setFirstResponse("");
    setResolution("");
  }

  async function handleSave(id: string) {
    const fr = parseInt(firstResponse, 10);
    const res = parseInt(resolution, 10);

    if (isNaN(fr) || isNaN(res) || fr < 1 || res < 1) {
      toast("Values must be positive numbers", "error");
      return;
    }

    if (res < fr) {
      toast("Resolution time must be >= first response time", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateSlaPolicy(id, {
        firstResponseMinutes: fr,
        resolutionMinutes: res,
      });
      setPolicies((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
      toast("SLA policy updated", "success");
    } catch {
      toast("Failed to update policy", "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-slate-500">
        Loading SLA policies...
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                Priority
              </th>
              <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                First Response
              </th>
              <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                Resolution
              </th>
              <th className="px-5 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {policies.map((policy) => (
              <tr
                key={policy.id}
                className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
              >
                <td className="px-5 py-3 font-medium capitalize text-slate-900 dark:text-slate-100">
                  {policy.name}
                </td>
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                  {editingId === policy.id ? (
                    <Input
                      type="number"
                      value={firstResponse}
                      onChange={(e) => setFirstResponse(e.target.value)}
                      className="w-24"
                      aria-label="First response minutes"
                      min={1}
                    />
                  ) : (
                    formatMinutes(policy.firstResponseMinutes)
                  )}
                </td>
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                  {editingId === policy.id ? (
                    <Input
                      type="number"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-24"
                      aria-label="Resolution minutes"
                      min={1}
                    />
                  ) : (
                    formatMinutes(policy.resolutionMinutes)
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {editingId === policy.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(policy.id)}
                        isLoading={isSaving}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="tertiary"
                      onClick={() => startEdit(policy)}
                    >
                      Edit
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
