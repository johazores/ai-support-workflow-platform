import { redirect } from "next/navigation";
import { getCurrentRootAdmin } from "@/features/root-auth/services/root-session-service";

export async function requireRootAdmin() {
  const rootAdmin = await getCurrentRootAdmin();

  if (!rootAdmin) {
    redirect("/root/login");
  }

  return rootAdmin;
}
