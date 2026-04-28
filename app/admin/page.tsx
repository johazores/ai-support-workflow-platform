import Link from "next/link";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { LogoutButton } from "@/features/auth/components/logout-button";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Dashboard</h1>
          </div>

          <LogoutButton />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/workflows"
            className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-slate-50"
          >
            <h2 className="font-semibold text-slate-950">Workflows</h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage workflow automation rules.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
