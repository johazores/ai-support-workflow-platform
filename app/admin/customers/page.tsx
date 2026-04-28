import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { AppHeader } from "@/components/layout/app-header";
import { CustomerDirectory } from "@/features/customers/components/customer-directory";

export default async function CustomersPage() {
  const user = await requireSupervisor();

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-900">
        <section className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Customer Directory
            </h1>
          </div>

          <CustomerDirectory />
        </section>
      </main>
    </>
  );
}
