"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, apiClient } from "@/lib/api-client";

type ProviderSummary = {
  id: string;
  key: string;
  name: string;
  category: string;
  isEnabled: boolean;
  priority: number;
  defaultModel: string | null;
  baseUrl: string | null;
  credential: {
    maskedValue: string | null;
    lastTestedAt: string | Date | null;
    lastTestStatus: string | null;
    lastError: string | null;
  } | null;
};

type ProviderManagerProps = {
  providers: ProviderSummary[];
};

export function ProviderManager({ providers }: ProviderManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProviderSummary | null>(null);
  const [credential, setCredential] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function beginEdit(provider: ProviderSummary) {
    setEditing({ ...provider });
    setCredential("");
    setMessage(null);
  }

  async function saveProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await apiClient("/api/root/providers", {
        method: "PUT",
        body: {
          key: editing.key,
          name: editing.name,
          category: editing.category,
          isEnabled: editing.isEnabled,
          priority: editing.priority,
          defaultModel: editing.defaultModel || "",
          baseUrl: editing.baseUrl || "",
          credential: credential || undefined,
          credentialLabel: "Primary",
        },
      });
      setMessage({ type: "success", text: `${editing.name} updated.` });
      setEditing(null);
      setCredential("");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Failed to save provider.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function testProvider(provider: ProviderSummary) {
    setTestingId(provider.id);
    setMessage(null);
    try {
      await apiClient(`/api/root/providers/${provider.id}/test`, {
        method: "POST",
      });
      setMessage({
        type: "success",
        text: `${provider.name} connection succeeded.`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof ApiError
            ? error.message
            : `${provider.name} connection failed.`,
      });
      router.refresh();
    } finally {
      setTestingId(null);
    }
  }

  if (editing) {
    return (
      <Card className="p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {editing.category}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              Configure {editing.name}
            </h2>
          </div>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
        </div>

        <form onSubmit={saveProvider} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Default model"
              value={editing.defaultModel || ""}
              onChange={(event) =>
                setEditing({ ...editing, defaultModel: event.target.value })
              }
              placeholder="Provider model identifier"
              fullWidth
            />
            <Input
              label="Priority"
              type="number"
              value={String(editing.priority)}
              onChange={(event) =>
                setEditing({
                  ...editing,
                  priority: Number(event.target.value) || 0,
                })
              }
              fullWidth
            />
          </div>

          <Input
            label="Base URL"
            type="url"
            value={editing.baseUrl || ""}
            onChange={(event) =>
              setEditing({ ...editing, baseUrl: event.target.value })
            }
            placeholder="Leave blank to use the provider default"
            fullWidth
          />

          <Input
            label={editing.credential ? "Rotate credential" : "Credential"}
            type="password"
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            placeholder={
              editing.credential
                ? `Configured as ${editing.credential.maskedValue}. Leave blank to keep it.`
                : "Enter the provider credential"
            }
            fullWidth
          />

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={editing.isEnabled}
              onChange={(event) =>
                setEditing({ ...editing, isEnabled: event.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Enable this provider for platform use
          </label>

          <Button type="submit" isLoading={isSaving}>
            Save provider
          </Button>
        </form>
      </Card>
    );
  }

  const groupedProviders = providers.reduce<Record<string, ProviderSummary[]>>(
    (groups, provider) => {
      groups[provider.category] ??= [];
      groups[provider.category].push(provider);
      return groups;
    },
    {},
  );

  return (
    <div className="space-y-8">
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {Object.entries(groupedProviders).map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
            {category}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((provider) => (
              <Card key={provider.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-950 dark:text-white">
                        {provider.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          provider.isEnabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {provider.isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{provider.key}</p>
                  </div>
                  <Button variant="secondary" onClick={() => beginEdit(provider)}>
                    Configure
                  </Button>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Credential</dt>
                    <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                      {provider.credential?.maskedValue || "Not configured"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Default model</dt>
                    <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                      {provider.defaultModel || "Not set"}
                    </dd>
                  </div>
                </dl>

                {provider.credential && (
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <p className="text-xs text-slate-500">
                      {provider.credential.lastTestStatus
                        ? `Last test: ${provider.credential.lastTestStatus}`
                        : "Connection not tested"}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => testProvider(provider)}
                      isLoading={testingId === provider.id}
                    >
                      Test connection
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
