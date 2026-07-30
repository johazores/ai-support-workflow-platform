import Link from "next/link";
import { RootLogoutButton } from "@/features/root-auth/components/root-logout-button";

type RootAdminShellProps = {
  rootAdmin: { displayName: string; username: string };
  children: React.ReactNode;
};

const navigation = [
  { href: "/root", label: "Overview" },
  { href: "/root/providers", label: "Providers" },
  { href: "/root/settings", label: "Runtime Settings" },
  { href: "/root/organizations", label: "Organizations" },
  { href: "/root/system-health", label: "System Health" },
  { href: "/root/audit-logs", label: "Audit Logs" },
];

export function RootAdminShell({ rootAdmin, children }: RootAdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/root"
              className="font-semibold text-slate-950 dark:text-white"
            >
              Platform Control Plane
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              Independent Root Administration
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {rootAdmin.displayName}
              </p>
              <p className="text-xs text-slate-500">@{rootAdmin.username}</p>
            </div>
            <RootLogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
