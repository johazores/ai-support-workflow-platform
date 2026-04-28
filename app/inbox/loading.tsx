import { TicketListSkeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-7 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <TicketListSkeleton />
      </section>
    </main>
  );
}
