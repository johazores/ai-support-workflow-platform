"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { ApiError, apiClient } from "@/lib/api-client";

type SettingSummary = {
  id: string;
  key: string;
  category: string;
  value: unknown;
  isSecret: boolean;
  isConfigured: boolean;
  description: string | null;
  updatedAt: string | Date;
};

type SystemSettingsManagerProps = {
  settings: SettingSummary[];
};

const EMPTY_FORM = {
  key: "",
  category: "general",
  value: "",
  isSecret: false,
  description: "",
};

export function SystemSettingsManager({ settings }: SystemSettingsManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function editSetting(setting: SettingSummary) {
    setForm({
      key: setting.key,
      category: setting.category,
      value: setting.isSecret
        ? ""
        : typeof setting.value === "string"
          ? setting.value
          : JSON.stringify(setting.value, null, 2),
      isSecret: setting.isSecret,
      description: setting.description || "",
    });
    setMessage(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    let value: unknown = form.value;
    if (!form.isSecret) {
      const trimmed = form.value.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          value = JSON.parse(trimmed);
        } catch {
          setMessage({ type: "error", text: "The JSON value is invalid." });
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      await apiClient("/api/root/settings", {
        method: "PUT",
        body: {
          key: form.key,
          category: form.category,
          value,
          isSecret: form.isSecret,
          description: form.description,
        },
      });
      setMessage({ type: "success", text: `${form.key} saved.` });
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Failed to save setting.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(setting: SettingSummary) {
    if (!window.confirm(`Delete ${setting.key}?`)) return;

    setDeletingId(setting.id);
    setMessage(null);
    try {
      await apiClient(`/api/root/settings/${setting.id}`, { method: "DELETE" });
      setMessage({ type: "success", text: `${setting.key} deleted.` });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Failed to delete setting.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = settings.reduce<Record<string, SettingSummary[]>>(
    (groups, setting) => {
      groups[setting.category] ??= [];
      groups[setting.category].push(setting);
      return groups;
    },
    {},
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-8">
        {message && <Alert type={message.type}>{message.text}</Alert>}

        {settings.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              No database-managed settings yet
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Add the first setting using the form. Bootstrap secrets remain in the
              deployment environment.
            </p>
          </Card>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map((setting) => (
                  <Card key={setting.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="break-all font-mono text-sm font-semibold text-slate-950 dark:text-white">
                            {setting.key}
                          </h3>
                          {setting.isSecret && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Secret
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {setting.description || "No description provided."}
                        </p>
                        <p className="mt-3 break-all text-xs text-slate-500">
                          Value: {String(setting.value ?? "Not configured")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => editSetting(setting)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => remove(setting)}
                          isLoading={deletingId === setting.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Card className="h-fit p-6 xl:sticky xl:top-6">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Add or update setting
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Secret values are encrypted before storage and are never returned in
          plaintext.
        </p>

        <form onSubmit={save} className="mt-6 space-y-4">
          <Input
            label="Key"
            value={form.key}
            onChange={(event) => setForm({ ...form, key: event.target.value })}
            placeholder="billing.default_currency"
            pattern="[a-z0-9._-]+"
            required
            fullWidth
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
            required
            fullWidth
          />
          <TextArea
            label={form.isSecret ? "Secret value" : "Value"}
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            placeholder={form.isSecret ? "Enter a new secret" : "Text or JSON"}
            rows={4}
            required
            fullWidth
          />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            rows={2}
            fullWidth
          />
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isSecret}
              onChange={(event) =>
                setForm({ ...form, isSecret: event.target.checked, value: "" })
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Encrypt this value
          </label>
          <Button type="submit" fullWidth isLoading={isSaving}>
            Save setting
          </Button>
        </form>
      </Card>
    </div>
  );
}
