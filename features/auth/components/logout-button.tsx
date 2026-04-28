"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to logout");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
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
