"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError, apiClient } from "@/lib/api-client";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  members: number;
  tickets: number;
  workflows: number;
  createdAt: string | Date;
};

export function RootOrganizationList({
  organizations,
}: {
  organizations: OrganizationSummary[];
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function toggleStatus(organization: OrganizationSummary) {
    const nextStatus = organization.status === "active" ? "suspended" : "active";
    setUpdatingId(organization.id);
    setMessage(null);

    try {
      await apiClient(`/api/root/organizations/${organization.id}`, {
        method: "PUT",
        body: { status: nextStatus },
      });
      setMessage({
        type: "success",
        text: `${organization.name} is now ${nextStatus}.`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof ApiError
            ? error.message
            : "Failed to update organization.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {organizations.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-slate-950 dark:text-white">
            No organizations yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The first legacy workspace is created automatically when an existing user
            signs in.
          </p>
        </Card>
      ) : (
        organizations.map((organization) => (
          <Card key={organization.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    {organization.name}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      organization.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {organization.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">/{organization.slug}</p>
              </div>

              <Button
                variant={organization.status === "active" ? "danger" : "secondary"}
                onClick={() => toggleStatus(organization)}
                isLoading={updatingId === organization.id}
              >
                {organization.status === "active" ? "Suspend" : "Reactivate"}
              </Button>
            </div>

            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Members</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {organization.members}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Tickets</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {organization.tickets}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Workflows</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {organization.workflows}
                </dd>
              </div>
            </dl>
          </Card>
        ))
      )}
    </div>
  );
}
