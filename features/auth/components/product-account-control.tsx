"use client";

import { UserButton } from "@clerk/nextjs";
import { LogoutButton } from "@/features/auth/components/logout-button";

export function ProductAccountControl({
  authProvider,
}: {
  authProvider?: "clerk" | "legacy";
}) {
  return authProvider === "clerk" ? (
    <UserButton />
  ) : (
    <LogoutButton />
  );
}
