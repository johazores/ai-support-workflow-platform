"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/services/auth-client-service";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch {
      alert("Failed to logout.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      isLoading={isLoading}
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
}
