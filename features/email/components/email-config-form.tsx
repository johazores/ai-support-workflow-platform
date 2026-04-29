"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type MailboxConfig = {
  id?: string;
  name: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
  fromAddress: string;
  fromName: string;
  isActive: boolean;
  isDefault: boolean;
};

const DEFAULTS: MailboxConfig = {
  name: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  imapHost: "",
  imapPort: 993,
  imapUser: "",
  imapPass: "",
  fromAddress: "",
  fromName: "Support",
  isActive: false,
  isDefault: false,
};

export function EmailConfigForm() {
  const { toast } = useToast();
  const [mailboxes, setMailboxes] = useState<MailboxConfig[]>([]);
  const [editingMailbox, setEditingMailbox] = useState<MailboxConfig | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MailboxConfig | null>(null);

  const loadMailboxes = useCallback(() => {
    apiClient<{ data: MailboxConfig[] }>("/api/email-config")
      .then((res) => {
        setMailboxes(res.data ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    loadMailboxes();
  }, [loadMailboxes]);

  function startCreate() {
    setEditingMailbox({ ...DEFAULTS });
  }

  function startEdit(mailbox: MailboxConfig) {
    setEditingMailbox({ ...mailbox });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMailbox) return;

    setSaving(true);
    try {
      if (editingMailbox.id) {
        await apiClient(`/api/email-config/${editingMailbox.id}`, {
          method: "PUT",
          body: editingMailbox,
        });
        toast("Mailbox updated");
      } else {
        await apiClient("/api/email-config", {
          method: "POST",
          body: editingMailbox,
        });
        toast("Mailbox created");
      }
      setEditingMailbox(null);
      loadMailboxes();
    } catch {
      toast("Failed to save mailbox", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await apiClient(`/api/email-config/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast("Mailbox deleted");
      setDeleteTarget(null);
      loadMailboxes();
    } catch {
      toast("Failed to delete mailbox", "error");
    }
  }

  function update(
    field: keyof MailboxConfig,
    value: string | number | boolean,
  ) {
    setEditingMailbox((prev) => (prev ? { ...prev, [field]: value } : null));
  }

  if (!loaded) {
    return <p className="animate-pulse text-sm text-slate-500">Loading...</p>;
  }

  if (editingMailbox) {
    return (
      <form onSubmit={handleSave} className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {editingMailbox.id ? "Edit Mailbox" : "New Mailbox"}
          </h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditingMailbox(null)}
          >
            Cancel
          </Button>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Mailbox Identity
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mailbox Name"
              value={editingMailbox.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Support, Sales, Billing"
            />
            <Input
              label="From Address"
              type="email"
              value={editingMailbox.fromAddress}
              onChange={(e) => update("fromAddress", e.target.value)}
              placeholder="support@example.com"
            />
            <Input
              label="From Name"
              value={editingMailbox.fromName}
              onChange={(e) => update("fromName", e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            SMTP (Outbound)
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Host"
              value={editingMailbox.smtpHost}
              onChange={(e) => update("smtpHost", e.target.value)}
              placeholder="smtp.example.com"
            />
            <Input
              label="Port"
              type="number"
              value={String(editingMailbox.smtpPort)}
              onChange={(e) => update("smtpPort", Number(e.target.value))}
            />
            <Input
              label="Username"
              value={editingMailbox.smtpUser}
              onChange={(e) => update("smtpUser", e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              value={editingMailbox.smtpPass}
              onChange={(e) => update("smtpPass", e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            IMAP (Inbound)
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Host"
              value={editingMailbox.imapHost}
              onChange={(e) => update("imapHost", e.target.value)}
              placeholder="imap.example.com"
            />
            <Input
              label="Port"
              type="number"
              value={String(editingMailbox.imapPort)}
              onChange={(e) => update("imapPort", Number(e.target.value))}
            />
            <Input
              label="Username"
              value={editingMailbox.imapUser}
              onChange={(e) => update("imapUser", e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              value={editingMailbox.imapPass}
              onChange={(e) => update("imapPass", e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </fieldset>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={editingMailbox.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={editingMailbox.isDefault}
              onChange={(e) => update("isDefault", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Default mailbox
          </label>
        </div>

        <Button type="submit" disabled={saving} isLoading={saving}>
          {editingMailbox.id ? "Update Mailbox" : "Create Mailbox"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {mailboxes.length} mailbox{mailboxes.length !== 1 ? "es" : ""}{" "}
          configured
        </p>
        <Button onClick={startCreate}>Add Mailbox</Button>
      </div>

      {mailboxes.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
          No mailboxes configured. Add one to enable email integration.
        </p>
      ) : (
        <div className="space-y-3">
          {mailboxes.map((mb) => (
            <div
              key={mb.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {mb.name}
                  </span>
                  {mb.isDefault && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Default
                    </span>
                  )}
                  <span
                    className={`h-2 w-2 rounded-full ${mb.isActive ? "bg-green-500" : "bg-slate-300"}`}
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {mb.fromName} &lt;{mb.fromAddress}&gt;
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(mb)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeleteTarget(mb)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Mailbox"
        variant="destructive"
      >
        Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This
        cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
