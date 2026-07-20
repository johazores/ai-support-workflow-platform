import type { Metadata } from "next";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";

export const metadata: Metadata = {
  title: "Audit Logs | Root Admin",
  robots: { index: false, follow: false },
};

export default async function RootAuditLogsPage() {
  const rootAdmin = await requireRootAdmin();
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <RootAdminShell rootAdmin={rootAdmin}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Security and compliance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Platform Audit Logs
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The latest 100 Root Admin, product-user, and system security events.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        {events.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No platform audit events have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Time
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Actor
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Action
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Target
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {event.createdAt
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19)}{" "}
                      UTC
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                      {event.actorType}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-900 dark:text-slate-100">
                      {event.action}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                      {event.targetType
                        ? `${event.targetType}${event.targetId ? ` · ${event.targetId}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </RootAdminShell>
  );
}
