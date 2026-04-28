import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { CurrentUserBadge } from "@/features/auth/components/current-user-badge";

type AppHeaderProps = {
  user: {
    name: string;
    role: string;
  };
};

export function AppHeader({ user }: AppHeaderProps) {
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

          <nav className="flex items-center gap-1">
            <Link
              href="/inbox"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              Inbox
            </Link>

            {user.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <CurrentUserBadge name={user.name} role={user.role} />
          <div className="h-5 w-px bg-slate-200" />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
