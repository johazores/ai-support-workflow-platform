import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/features/auth/services/clerk-config";

export const metadata: Metadata = {
  title: "Sign in | AI Support Workflow Platform",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  if (!isClerkConfigured()) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <SignIn />
    </main>
  );
}
