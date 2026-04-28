"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAsyncAction } from "@/lib/use-async-action";
import { login } from "@/features/auth/services/auth-client-service";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const { isLoading, message, messageType, execute, clearMessage } =
    useAsyncAction();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await execute(async () => {
      await login(email, password);
    }, "Invalid email or password.");

    if (success) {
      router.push("/inbox");
      router.refresh();
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Admin Access
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Login
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          fullWidth
          required
        />

        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          fullWidth
          required
        />

        {messageType === "error" && (
          <Alert type="error" dismissible onDismiss={clearMessage}>
            {message}
          </Alert>
        )}

        <Button type="submit" fullWidth isLoading={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Card>
  );
}
