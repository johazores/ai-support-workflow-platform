"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CurrentUserBadge } from "@/features/auth/components/current-user-badge";
import { ProductAccountControl } from "@/features/auth/components/product-account-control";
import {
  hasPermission,
  isElevatedRole,
  type Permission,
} from "@/features/auth/services/role-service";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { Icon, type IconName } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type ProductShellUser = {
  name: string;
  role: string;
  authProvider?: "clerk" | "legacy";
};

type ProductShellProps = {
  children: ReactNode;
  user: ProductShellUser;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  permission?: Permission;
  elevated?: boolean;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: "dashboard",
        elevated: true,
      },
      { href: "/inbox", label: "Inbox", icon: "inbox" },
      {
        href: "/admin/customers",
        label: "Customers",
        icon: "customers",
        elevated: true,
      },
      {
        href: "/admin/saved-replies",
        label: "Knowledge",
        icon: "knowledge",
        permission: "saved-replies:read",
        elevated: true,
      },
    ],
  },
  {
    label: "AI & automation",
    items: [
      {
        href: "/admin/workflows",
        label: "Workflows",
        icon: "workflow",
        permission: "workflows:manage",
        elevated: true,
      },
      {
        href: "/admin/executions",
        label: "Executions",
        icon: "activity",
        permission: "workflows:read",
        elevated: true,
      },
      {
        href: "/admin/ai-logs",
        label: "AI activity",
        icon: "sparkles",
        permission: "ai-logs:read",
        elevated: true,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: "analytics",
        permission: "analytics:read",
        elevated: true,
      },
      {
        href: "/admin/users",
        label: "Team",
        icon: "team",
        permission: "users:manage",
        elevated: true,
      },
      {
        href: "/admin/email-logs",
        label: "Email delivery",
        icon: "email",
        permission: "email-logs:read",
        elevated: true,
      },
      {
        href: "/admin/email-settings",
        label: "Settings",
        icon: "settings",
        permission: "email-settings:manage",
        elevated: true,
      },
    ],
  },
];

function isItemVisible(item: NavigationItem, user: ProductShellUser) {
  if (item.elevated && !isElevatedRole(user.role)) return false;
  if (item.permission && !hasPermission(user.role, item.permission)) return false;
  return true;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  if (href === "/inbox") return pathname.startsWith("/inbox");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pageTitle(pathname: string) {
  const item = navigationGroups
    .flatMap((group) => group.items)
    .find((navigationItem) => isActivePath(pathname, navigationItem.href));

  return item?.label ?? "Support operations";
}

function SidebarContent({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: ProductShellUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <Link
          href="/inbox"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/20 transition-transform group-hover:scale-[1.03]">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight text-white">
              SupportFlow
            </span>
            <span className="block text-[11px] font-medium text-slate-400">
              AI operations
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6" aria-label="Primary navigation">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            isItemVisible(item, user),
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                        active
                          ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        name={item.icon}
                        className={`h-[18px] w-[18px] ${
                          active
                            ? "text-teal-300"
                            : "text-slate-500 transition-colors group-hover:text-slate-300"
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.1)]" />
            Workspace online
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            AI, inbox, and automation tools are available.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProductShell({ children, user }: ProductShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 dark:bg-white dark:text-slate-950"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-950 lg:block">
        <SidebarContent pathname={pathname} user={user} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[min(20rem,88vw)] border-r border-slate-800 bg-slate-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-6 z-10 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              aria-label="Close navigation"
            >
              <Icon name="x" />
            </button>
            <SidebarContent
              pathname={pathname}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Icon name="menu" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Support workspace
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                {pageTitle(pathname)}
              </h1>
            </div>

            <div className="hidden xl:block">
              <OrganizationSwitcher />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <NotificationBell />
              <div className="hidden md:block">
                <CurrentUserBadge name={user.name} role={user.role} />
              </div>
              <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
              <ProductAccountControl authProvider={user.authProvider} />
            </div>
          </div>

          <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-900 xl:hidden">
            <OrganizationSwitcher />
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
