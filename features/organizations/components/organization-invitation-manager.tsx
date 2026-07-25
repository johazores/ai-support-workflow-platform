"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  fetchOrganizationInvitations,
  inviteOrganizationMember,
  revokeOrganizationInvitation,
  type OrganizationInvitation,
} from "@/features/organizations/services/organization-invitation-client-service";
import { formatDateTime } from "@/lib/utils";

const roles = ["admin", "supervisor", "agent"] as const;

const statusClassName: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900",
  accepted:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900",
  revoked:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600",
  expired:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900",
};

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function OrganizationInvitationManager() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [isInviting, setIsInviting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizationInvitations()
      .then(setInvitations)
      .catch((error) =>
        toast(
          error instanceof Error ? error.message : "Failed to load invitations",
          "error",
        ),
      )
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setIsInviting(true);

    try {
      const result = await inviteOrganizationMember({ email, role });
      setEmail("");
      setRole("agent");

      if (result.delivery === "member-added") {
        toast("Existing account added to this organization", "success");
        window.location.reload();
        return;
      }

      setInvitations((previous) => [
        result.invitation,
        ...previous.filter((item) => item.id !== result.invitation.id),
      ]);
      toast("Invitation email sent", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to invite member",
        "error",
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRevoke(invitation: OrganizationInvitation) {
    setRevokingId(invitation.id);

    try {
      const revoked = await revokeOrganizationInvitation(invitation.id);
      setInvitations((previous) =>
        previous.map((item) => (item.id === revoked.id ? revoked : item)),
      );
      toast("Invitation revoked", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to revoke invitation",
        "error",
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Invite members
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send a secure Clerk invitation. Existing product accounts are added
          immediately when possible.
        </p>
      </div>

      <form
        onSubmit={handleInvite}
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            required
            fullWidth
          />
          <Select
            label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            options={roles.map((item) => ({
              value: item,
              label: item.charAt(0).toUpperCase() + item.slice(1),
            }))}
            fullWidth
          />
          <Button type="submit" isLoading={isInviting} className="sm:mb-px">
            Send invite
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Invitation history
          </h3>
        </div>

        {loading ? (
          <p className="animate-pulse px-5 py-6 text-sm text-slate-500">
            Loading invitations...
          </p>
        ) : invitations.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
            No invitations have been sent from this organization yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Sent
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {invitation.email}
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600 dark:text-slate-300">
                      {invitation.role}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClassName[invitation.status] ?? statusClassName.revoked}`}
                      >
                        {statusLabel(invitation.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(invitation.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {invitation.status === "pending" ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          isLoading={revokingId === invitation.id}
                          onClick={() => handleRevoke(invitation)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
