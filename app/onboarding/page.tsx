import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductAccountControl } from "@/features/auth/components/product-account-control";
import { isClerkConfigured } from "@/features/auth/services/clerk-config";
import { getClerkAppSessionUser } from "@/features/auth/services/clerk-session-service";
import { OrganizationOnboardingForm } from "@/features/organizations/components/organization-onboarding-form";

export const metadata: Metadata = {
  title: "Set up your organization | AI Support Workflow Platform",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await getClerkAppSessionUser();
  if (!user) redirect(isClerkConfigured() ? "/sign-in" : "/login");
  if (user.organizationId) redirect("/inbox");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex justify-end">
          <ProductAccountControl authProvider="clerk" />
        </div>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
              AI
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Welcome, {user.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Create your organization
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This workspace keeps your tickets, workflows, users, email, and
              analytics isolated from every other organization.
            </p>
          </div>

          <OrganizationOnboardingForm />
        </section>
      </div>
    </main>
  );
}
