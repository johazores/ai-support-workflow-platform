"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export function RootLogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    try {
      await apiClient("/api/root/auth/logout", { method: "POST" });
    } finally {
      router.replace("/root/login");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={logout} isLoading={isLoading}>
      Sign out
    </Button>
  );
}
