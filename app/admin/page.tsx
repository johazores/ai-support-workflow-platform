import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { hasPermission } from "@/features/auth/services/role-service";

type AdminCard = {
  href: string;
  title: string;
  description: string;
  permission?: Parameters<typeof hasPermission>[1];
};

const adminCards: AdminCard[] = [
  {
    href: "/admin/workflows",
    title: "Workflows",
    description: "Create and manage ticket automation rules.",
    permission: "workflows:manage",
  },
  {
    href: "/admin/executions",
    title: "Execution History",
    description: "Inspect workflow runs, steps, outputs, and failures.",
    permission: "workflows:read",
  },
  {
    href: "/admin/ai-logs",
    title: "AI Usage",
    description: "Review provider calls, successes, and failures.",
    permission: "ai-logs:read",
  },
  {
    href: "/admin/saved-replies",
    title: "Saved Replies",
    description: "Manage reusable customer response templates.",
    permission: "saved-replies:read",
  },
  {
    href: "/admin/analytics",
    title: "Analytics",
    description: "Track ticket volume and operational performance.",
    permission: "analytics:read",
  },
  {
    href: "/admin/audit-logs",
    title: "Audit Logs",
    description: "Review workspace activity and ticket changes.",
    permission: "audit-logs:read",
  },
  {
    href: "/admin/users",
    title: "Users",
    description: "Manage agents, supervisors, and tenant administrators.",
    permission: "users:manage",
  },
  {
    href: "/admin/sla",
    title: "SLA Policies",
    description: "Set response and resolution targets by priority.",
    permission: "workflows:manage",
  },
  {
    href: "/admin/customers",
    title: "Customers",
    description: "Browse customer history and support activity.",
  },
  {
    href: "/admin/email-logs",
    title: "Email Logs",
    description: "Track outbound delivery results and failures.",
    permission: "email-logs:read",
  },
  {
    href: "/admin/email-settings",
    title: "Email Settings",
    description: "Configure encrypted SMTP and IMAP mailboxes.",
    permission: "email-settings:manage",
  },
];

export default async function AdminPage() {
  const user = await requireSupervisor();
  const visibleCards = adminCards.filter(
    (card) => !card.permission || hasPermission(user.role, card.permission),
  );

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <section className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workspace administration
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Manage automation, support operations, team access, and tenant-level
                integrations for this organization.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Active workspace
              </p>
              <p className="mt-1 max-w-52 truncate font-mono text-xs text-slate-800 dark:text-slate-200">
                {user.organizationId}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card, index) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition-colors group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-white dark:group-hover:text-slate-950">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
