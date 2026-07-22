import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { isClerkConfigured } from "@/features/auth/services/clerk-config";

export default function LoginPage() {
  if (isClerkConfigured()) redirect("/sign-in");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              AI
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              Support
            </span>
          </Link>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
