import { TicketList } from "@/features/tickets/components/ticket-list";
import { AppHeader } from "@/components/layout/app-header";
import { requireUser } from "@/features/auth/services/auth-guard-service";
export default async function InboxPage() {
  const user = await requireUser();

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Support Inbox
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Tickets
            </h1>
          </div>

          <TicketList />
        </section>
      </main>
    </>
  );
}
