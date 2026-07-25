"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  deleteUser,
  fetchUsers,
  updateUserRole,
} from "@/features/auth/services/user-client-service";
import { formatDateTime } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

const roles = ["admin", "supervisor", "agent"] as const;

export function UserManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => toast("Failed to load organization members", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? updated : user)),
      );
      toast("Role updated", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to update role",
        "error",
      );
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setIsRemoving(true);

    try {
      await deleteUser(removeTarget.id);
      setUsers((previous) =>
        previous.filter((user) => user.id !== removeTarget.id),
      );
      toast("Member removed from this organization", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to remove member",
        "error",
      );
    } finally {
      setIsRemoving(false);
      setRemoveTarget(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Current members
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage roles or remove access for people already in this organization.
          </p>
        </div>
        {!loading && (
          <p className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
            {users.length} {users.length === 1 ? "member" : "members"}
          </p>
        )}
      </div>

      {loading ? (
        <p className="animate-pulse text-sm text-slate-500">
          Loading organization members...
        </p>
      ) : users.length === 0 ? (
        <EmptyState
          icon="file"
          title="No organization members yet"
          description="Invite a member above to start collaborating in this workspace."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Joined
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {user.email}
                    </td>
                    <td className="px-5 py-3">
                      <Select
                        value={user.role}
                        onChange={(event) =>
                          handleRoleChange(user.id, event.target.value)
                        }
                        options={roles.map((item) => ({
                          value: item,
                          label:
                            item.charAt(0).toUpperCase() + item.slice(1),
                        }))}
                        aria-label={`Role for ${user.name}`}
                        className="w-32"
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => setRemoveTarget(user)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove organization member"
        variant="destructive"
        confirmLabel="Remove"
        isLoading={isRemoving}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      >
        Remove <strong>{removeTarget?.name}</strong> from this organization? Their
        global account and memberships in other organizations are not deleted.
      </ConfirmDialog>
    </section>
  );
}
