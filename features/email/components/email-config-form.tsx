"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";

type EmailConfigData = {
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
};

const DEFAULTS: EmailConfigData = {
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
};

export function EmailConfigForm() {
  const { toast } = useToast();
  const [config, setConfig] = useState<EmailConfigData>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient<{ data: EmailConfigData | null }>("/api/email-config")
      .then((res) => {
        if (res.data) setConfig(res.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient("/api/email-config", {
        method: "PUT",
        body: config,
      });
      toast("Email configuration saved");
    } catch {
      toast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  }

  function update(
    field: keyof EmailConfigData,
    value: string | number | boolean,
  ) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  if (!loaded) {
    return <p className="animate-pulse text-sm text-slate-500">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          SMTP (Outbound)
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Host"
            value={config.smtpHost}
            onChange={(e) => update("smtpHost", e.target.value)}
            placeholder="smtp.example.com"
          />
          <Input
            label="Port"
            type="number"
            value={String(config.smtpPort)}
            onChange={(e) => update("smtpPort", Number(e.target.value))}
          />
          <Input
            label="Username"
            value={config.smtpUser}
            onChange={(e) => update("smtpUser", e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={config.smtpPass}
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
            value={config.imapHost}
            onChange={(e) => update("imapHost", e.target.value)}
            placeholder="imap.example.com"
          />
          <Input
            label="Port"
            type="number"
            value={String(config.imapPort)}
            onChange={(e) => update("imapPort", Number(e.target.value))}
          />
          <Input
            label="Username"
            value={config.imapUser}
            onChange={(e) => update("imapUser", e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={config.imapPass}
            onChange={(e) => update("imapPass", e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Sender Identity
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="From Address"
            type="email"
            value={config.fromAddress}
            onChange={(e) => update("fromAddress", e.target.value)}
            placeholder="support@example.com"
          />
          <Input
            label="From Name"
            value={config.fromName}
            onChange={(e) => update("fromName", e.target.value)}
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={config.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Enable email integration
        </label>
      </div>

      <Button type="submit" disabled={saving} isLoading={saving}>
        Save Configuration
      </Button>
    </form>
  );
}
