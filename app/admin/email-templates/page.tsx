import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { EmailTemplateBuilder } from "@/features/email/components/email-template-builder";

export default async function EmailTemplatesPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-900">
        <section className="mx-auto max-w-4xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Email Templates
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create and manage reusable email templates with variable
              placeholders.
            </p>
          </div>

          <EmailTemplateBuilder />
        </section>
      </main>
    </>
  );
}
