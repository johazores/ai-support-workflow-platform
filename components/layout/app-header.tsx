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
    <header className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <nav className="flex items-center gap-4">
          <Link href="/inbox" className="text-sm font-medium text-slate-700">
            Inbox
          </Link>

          {user.role === "admin" && (
            <Link href="/admin" className="text-sm font-medium text-slate-700">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <CurrentUserBadge name={user.name} role={user.role} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
