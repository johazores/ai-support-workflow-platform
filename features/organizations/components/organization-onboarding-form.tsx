"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OnboardingResponse = {
  data?: { id: string; name: string; slug: string; role: string };
  message?: string;
};

export function OrganizationOnboardingForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as OnboardingResponse;

      if (!response.ok) {
        throw new Error(payload.message || "Failed to create organization");
      }

      window.location.assign("/inbox");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create organization",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Organization name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Acme Support"
        minLength={2}
        maxLength={100}
        autoComplete="organization"
        required
        fullWidth
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" isLoading={submitting} fullWidth>
        Create organization
      </Button>
    </form>
  );
}
