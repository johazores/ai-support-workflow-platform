"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { CurrentUserBadge } from "@/features/auth/components/current-user-badge";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

import { isElevatedRole } from "@/features/auth/services/role-service";

type AppHeaderProps = {
  user: {
    name: string;
    role: string;
  };
};

export function AppHeader({ user }: AppHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link
            href="/inbox"
            className="flex items-center gap-2 text-slate-950"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">
              AI
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Support
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/inbox"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              Inbox
            </Link>

            {isElevatedRole(user.role) && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <NotificationBell />
          <CurrentUserBadge name={user.name} role={user.role} />
          <div className="h-5 w-px bg-slate-200" />
          <LogoutButton />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="animate-in border-t border-slate-100 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/inbox"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              onClick={() => setMobileOpen(false)}
            >
              Inbox
            </Link>

            {isElevatedRole(user.role) && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
            <NotificationBell />
            <CurrentUserBadge name={user.name} role={user.role} />
            <div className="flex-1" />
            <LogoutButton />
          </div>
        </div>
      )}
    </header>
  );
}
