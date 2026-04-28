"use client";

export default function TicketError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
          <h2 className="text-lg font-semibold text-red-800">
            Failed to load ticket
          </h2>
          <p className="mt-2 text-sm text-red-600">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
