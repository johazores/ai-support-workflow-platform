"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isCurrent: boolean;
};

type OrganizationsResponse = {
  data?: OrganizationOption[];
  message?: string;
};

export function OrganizationSwitcher() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/organizations", { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json()) as OrganizationsResponse;
        if (!response.ok) {
          throw new Error(payload.message || "Failed to load organizations");
        }
        return payload.data ?? [];
      })
      .then((items) => {
        if (cancelled) return;

        setOrganizations(items);
        const current = items.find((item) => item.isCurrent) ?? items[0];
        setSelectedId(current?.id ?? "");
      })
      .catch((error) => {
        if (cancelled) return;
        toast(
          error instanceof Error
            ? error.message
            : "Failed to load organizations",
          "error",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function handleChange(organizationId: string) {
    if (!organizationId || organizationId === selectedId || switching) return;

    const previousId = selectedId;
    setSelectedId(organizationId);
    setSwitching(true);

    try {
      const response = await fetch("/api/organizations/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ organizationId }),
      });
      const payload = (await response.json()) as OrganizationsResponse;

      if (!response.ok) {
        throw new Error(payload.message || "Failed to switch organization");
      }

      window.location.reload();
    } catch (error) {
      setSelectedId(previousId);
      setSwitching(false);
      toast(
        error instanceof Error ? error.message : "Failed to switch organization",
        "error",
      );
    }
  }

  if (loading) {
    return (
      <div
        className="h-9 w-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        aria-label="Loading organizations"
      />
    );
  }

  if (organizations.length === 0) return null;

  if (organizations.length === 1) {
    return (
      <div className="max-w-44 truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {organizations[0].name}
      </div>
    );
  }

  return (
    <Select
      aria-label="Active organization"
      value={selectedId}
      disabled={switching}
      onChange={(event) => handleChange(event.target.value)}
      options={organizations.map((organization) => ({
        value: organization.id,
        label: organization.name,
      }))}
      className="max-w-48"
    />
  );
}
