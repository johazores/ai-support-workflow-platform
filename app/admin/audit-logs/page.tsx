import { requirePermission } from "@/features/auth/services/auth-guard-service";
import { AppHeader } from "@/components/layout/app-header";
import { AuditLogViewer } from "@/features/audit/components/audit-log-viewer";

export default async function AuditLogsPage() {
  const user = await requirePermission("audit-logs:read");

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Activity history across all tickets.
            </p>
          </div>

          <AuditLogViewer />
        </section>
      </main>
    </>
  );
}
