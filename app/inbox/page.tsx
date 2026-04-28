import { TicketList } from "@/features/tickets/components/ticket-list";
import { requireUser } from "@/features/auth/services/auth-guard-service";
export default async function InboxPage() {
  await requireUser();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500">Support Inbox</p>
          <h1 className="text-3xl font-bold text-slate-950">Tickets</h1>
        </div>

        <TicketList />
      </section>
    </main>
  );
}
