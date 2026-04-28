import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/session-service";

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
