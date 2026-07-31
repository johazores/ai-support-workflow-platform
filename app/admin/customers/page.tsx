import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { CustomerDirectory } from "@/features/customers/components/customer-directory";

export default async function CustomersPage() {
  await requireSupervisor();

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Customer context
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Customer directory
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Browse customer profiles, ticket history, and support activity.
        </p>
      </div>

      <CustomerDirectory />
    </section>
  );
}
