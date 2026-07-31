import { requirePermission } from "@/features/auth/services/auth-guard-service";
import { AuditLogViewer } from "@/features/audit/components/audit-log-viewer";

export default async function AuditLogsPage() {
  await requirePermission("audit-logs:read");

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Governance
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Audit logs
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Review workspace activity, administrative changes, and ticket events.
        </p>
      </div>

      <AuditLogViewer />
    </section>
  );
}
