import { TicketList } from "@/features/tickets/components/ticket-list";

export default function InboxPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Customer conversations
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Support inbox
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Prioritize, assign, and resolve customer requests from one shared
            workspace.
          </p>
        </div>
      </div>

      <TicketList />
    </section>
  );
}
