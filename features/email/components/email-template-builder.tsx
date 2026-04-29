"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiClient } from "@/lib/api-client";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string;
};

const VARIABLES = [
  "{{customer_name}}",
  "{{ticket_subject}}",
  "{{ticket_id}}",
  "{{agent_name}}",
];

export function EmailTemplateBuilder() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    apiClient<{ data: Template[] }>("/api/email-templates")
      .then((res) => {
        setTemplates(res.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function startNew() {
    setEditing(null);
    setForm({ name: "", subject: "", body: "" });
    setPreview(false);
  }

  function startEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body });
    setPreview(false);
  }

  async function handleSave() {
    if (!form.name || !form.subject || !form.body) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await apiClient<{ data: Template }>(
          `/api/email-templates/${editing.id}`,
          { method: "PATCH", body: form },
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === editing.id ? res.data : t)),
        );
        toast("Template updated");
      } else {
        const res = await apiClient<{ data: Template }>(
          "/api/email-templates",
          { method: "POST", body: form },
        );
        setTemplates((prev) => [res.data, ...prev]);
        toast("Template created");
      }
      setForm({ name: "", subject: "", body: "" });
      setEditing(null);
    } catch {
      toast("Failed to save template", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiClient(`/api/email-templates/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast("Template deleted");
    } catch {
      toast("Failed to delete template", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  function renderPreview(text: string) {
    return text
      .replace(/\{\{customer_name\}\}/g, "Jane Doe")
      .replace(/\{\{ticket_subject\}\}/g, "Order #12345")
      .replace(/\{\{ticket_id\}\}/g, "TK-001")
      .replace(/\{\{agent_name\}\}/g, "Support Agent");
  }

  if (!loaded) {
    return <p className="animate-pulse text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {editing ? "Edit Template" : "New Template"}
          </h2>
          {(editing || form.name) && (
            <button
              type="button"
              onClick={startNew}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-3">
          <Input
            label="Template Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Welcome Email"
            fullWidth
          />
          <Input
            label="Subject Line"
            value={form.subject}
            onChange={(e) =>
              setForm((f) => ({ ...f, subject: e.target.value }))
            }
            placeholder="e.g. Re: {{ticket_subject}}"
            fullWidth
          />
          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Body
              </label>
              <div className="flex gap-1">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, body: f.body + v }))}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <TextArea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={6}
              placeholder="Write your email template..."
              fullWidth
            />
          </div>

          {form.body && (
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {preview ? "Hide Preview" : "Show Preview"}
            </button>
          )}

          {preview && form.body && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Subject: {renderPreview(form.subject)}
              </p>
              <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {renderPreview(form.body)}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !form.name || !form.subject || !form.body}
            isLoading={saving}
          >
            {editing ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon="search"
          title="No templates yet"
          description="Create your first email template above."
        />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {t.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Subject: {t.subject}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(t)}
                  className="text-xs font-medium text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Template"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
      </ConfirmDialog>
    </div>
  );
}
