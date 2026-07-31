import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { EmailLogViewer } from "@/features/email-logs/components/email-log-viewer";

export default async function EmailLogsPage() {
  await requireSupervisor();

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Channel operations
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Email delivery
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Track outbound delivery status and investigate failed messages.
        </p>
      </div>

      <EmailLogViewer />
    </section>
  );
}
