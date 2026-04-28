export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-100 md:p-14">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Portfolio Project
          </p>

          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
            AI Support Workflow Platform
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-500">
            A clean support inbox and workflow automation platform built with
            Next.js, TypeScript, MongoDB, Prisma, and AI-ready service layers.
          </p>
        </div>
      </section>
    </main>
  );
}
