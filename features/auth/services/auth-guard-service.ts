import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/session-service";
import {
  isElevatedRole,
  hasPermission,
} from "@/features/auth/services/role-service";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/inbox");
  }

  return user;
}

export async function requireSupervisor() {
  const user = await requireUser();

  if (!isElevatedRole(user.role)) {
    redirect("/inbox");
  }

  return user;
}

export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
) {
  const user = await requireUser();

  if (!hasPermission(user.role, permission)) {
    redirect("/inbox");
  }

  return user;
}
