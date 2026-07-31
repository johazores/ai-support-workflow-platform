import { redirect } from "next/navigation";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { hasPermission } from "@/features/auth/services/role-service";
import { UserManager } from "@/features/auth/components/user-manager";
import { OrganizationInvitationManager } from "@/features/organizations/components/organization-invitation-manager";

export default async function UsersPage() {
  const user = await requireSupervisor();

  if (!hasPermission(user.role, "users:manage")) {
    redirect("/admin");
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace access
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Team management
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Invite teammates, manage organization roles, and revoke tenant access
          without affecting memberships in other organizations.
        </p>
      </div>

      <div className="space-y-8">
        <OrganizationInvitationManager />
        <UserManager />
      </div>
    </section>
  );
}
