import { TicketDetailSkeleton } from "@/components/ui/skeleton";

export default function TicketLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <TicketDetailSkeleton />
      </section>
    </main>
  );
}
