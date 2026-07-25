import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { hasPermission } from "@/features/auth/services/role-service";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { UserManager } from "@/features/auth/components/user-manager";
import { OrganizationInvitationManager } from "@/features/organizations/components/organization-invitation-manager";

export default async function UsersPage() {
  const user = await requireSupervisor();

  if (!hasPermission(user.role, "users:manage")) {
    redirect("/admin");
  }

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
              Team Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Invite teammates, manage organization roles, and revoke access from
              one tenant without affecting memberships in other organizations.
            </p>
          </div>

          <div className="space-y-10">
            <OrganizationInvitationManager />
            <UserManager />
          </div>
        </section>
      </main>
    </>
  );
}
