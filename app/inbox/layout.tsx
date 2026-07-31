import type { ReactNode } from "react";
import { ProductShell } from "@/components/layout/product-shell";
import { requireUser } from "@/features/auth/services/auth-guard-service";

export default async function InboxLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();

  return <ProductShell user={user}>{children}</ProductShell>;
}
