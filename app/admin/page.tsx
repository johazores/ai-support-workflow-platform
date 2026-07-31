import { OperationsDashboard } from "@/features/dashboard/components/operations-dashboard";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";

export default async function AdminPage() {
  const user = await requireSupervisor();

  return (
    <OperationsDashboard
      organizationId={user.organizationId}
      viewerName={user.name}
    />
  );
}
