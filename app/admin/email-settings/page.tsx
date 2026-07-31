import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { EmailConfigForm } from "@/features/email/components/email-config-form";

export default async function EmailSettingsPage() {
  await requireAdmin();

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Channel configuration
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Email settings
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Configure encrypted SMTP and IMAP mailboxes for this workspace.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
        <EmailConfigForm />
      </div>
    </section>
  );
}
