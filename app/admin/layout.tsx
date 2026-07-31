import type { ReactNode } from "react";
import { ProductShell } from "@/components/layout/product-shell";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireSupervisor();

  return <ProductShell user={user}>{children}</ProductShell>;
}
