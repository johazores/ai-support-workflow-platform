import { redirect } from "next/navigation";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { hasPermission } from "@/features/auth/services/role-service";
import { SlaPolicyEditor } from "@/features/sla/components/sla-policy-editor";

export default async function SlaPage() {
  const user = await requireSupervisor();

  if (!hasPermission(user.role, "workflows:manage")) {
    redirect("/admin");
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Service quality
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          SLA policies
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Configure response and resolution targets by ticket priority.
        </p>
      </div>

      <SlaPolicyEditor />
    </section>
  );
}
