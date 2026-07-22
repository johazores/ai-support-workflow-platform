import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RootLoginForm } from "@/features/root-auth/components/root-login-form";
import { getCurrentRootAdmin } from "@/features/root-auth/services/root-session-service";

export const metadata: Metadata = {
  title: "Root Admin Login | AI Support Workflow Platform",
  robots: { index: false, follow: false },
};

export default async function RootLoginPage() {
  const rootAdmin = await getCurrentRootAdmin();
  if (rootAdmin) redirect("/root");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <RootLoginForm />
    </main>
  );
}
