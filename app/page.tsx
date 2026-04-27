export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">
            Portfolio Project
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
            AI Support Workflow Platform
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            A clean support inbox and workflow automation platform built with
            Next.js, TypeScript, MongoDB, Prisma, and AI-ready service layers.
          </p>
        </div>
      </section>
    </main>
  );
}
