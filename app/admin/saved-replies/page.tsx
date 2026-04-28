import Link from "next/link";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { AppHeader } from "@/components/layout/app-header";
import { SavedReplyManager } from "@/features/saved-replies/components/saved-reply-manager";

export default async function SavedRepliesPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <section className="mx-auto max-w-3xl">
          <div className="mb-8">
            <Link
              href="/admin"
              className="group mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Admin
            </Link>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Saved Replies
            </h1>
          </div>

          <SavedReplyManager />
        </section>
      </main>
    </>
  );
}
