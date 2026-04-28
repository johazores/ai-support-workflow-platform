import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-10 shadow-lg ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 md:p-14">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              AI
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Portfolio Project
            </p>
          </div>

          <h1 className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-5xl">
            AI Support Workflow Platform
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
            A clean support inbox and workflow automation platform built with
            Next.js, TypeScript, MongoDB, Prisma, and AI-ready service layers.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Sign in to dashboard
            </Link>
            <Link
              href="https://github.com"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-700"
            >
              View on GitHub
            </Link>
          </div>

          <div className="mt-10 grid gap-4 border-t border-slate-100 pt-8 dark:border-slate-700 sm:grid-cols-3">
            {[
              {
                label: "Inbox & Tickets",
                desc: "Email-style support queue with search, filters, and pagination",
              },
              {
                label: "AI Draft Replies",
                desc: "LLM-powered draft generation with usage tracking and audit logs",
              },
              {
                label: "Workflow Automation",
                desc: "Configurable rules for auto-assignment, tagging, and escalation",
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
