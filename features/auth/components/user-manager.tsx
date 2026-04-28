"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import {
  fetchUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from "@/features/auth/services/user-client-service";

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
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => toast("Failed to load users", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);

    try {
      const user = await createUser({ name, email, password, role });
      setUsers((prev) => [user, ...prev]);
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("agent");
      toast("User created successfully", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create user",
        "error",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      toast("Role updated", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to update role",
        "error",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast("User deleted", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete user",
        "error",
      );
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-slate-500">Loading users...</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {users.length} {users.length === 1 ? "user" : "users"}
        </p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add User"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Create New User
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="Minimum 8 characters"
              fullWidth
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={roles.map((r) => ({
                value: r,
                label: r.charAt(0).toUpperCase() + r.slice(1),
              }))}
              fullWidth
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" isLoading={isCreating}>
              Create User
            </Button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <EmptyState
          icon="file"
          title="No users yet"
          description="Create the first user to get started."
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
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                        options={roles.map((r) => ({
                          value: r,
                          label: r.charAt(0).toUpperCase() + r.slice(1),
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
                        onClick={() => setDeleteTarget(user)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
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
        open={!!deleteTarget}
        title="Delete user"
        variant="destructive"
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
        This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
