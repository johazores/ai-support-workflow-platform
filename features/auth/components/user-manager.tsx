"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  createUser,
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
  const [showForm, setShowForm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => toast("Failed to load organization members", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);

    try {
      const user = await createUser({ name, email, password, role });
      setUsers((previous) => [
        user,
        ...previous.filter((item) => item.id !== user.id),
      ]);
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("agent");
      toast("Member added successfully", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to add member",
        "error",
      );
    } finally {
      setIsCreating(false);
    }
  }

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

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-slate-500">
        Loading organization members...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {users.length} {users.length === 1 ? "member" : "members"}
        </p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Member"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Add Organization Member
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <Input
              label="Temporary password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              helperText="Used only when a new local account must be created. Existing identities keep their credentials."
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
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" isLoading={isCreating}>
              Add Member
            </Button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <EmptyState
          icon="file"
          title="No organization members yet"
          description="Add a member to start collaborating in this workspace."
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
                    Created
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
    </div>
  );
}
