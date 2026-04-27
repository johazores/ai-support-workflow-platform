import { StatusBadge } from "@/components/ui/status-badge";
import { getTicketById } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";

type TicketDetailProps = {
  ticketId: string;
};

export async function TicketDetail({ ticketId }: TicketDetailProps) {
  const ticket = await getTicketById(ticketId);

  if (!ticket) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                {ticket.subject}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {ticket.customer.name} · {ticket.customer.email}
              </p>
            </div>

            <StatusBadge status={ticket.status as TicketStatus} />
          </div>
        </div>

        <div className="divide-y">
          {ticket.messages.map((message) => (
            <article key={message.id} className="p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium capitalize text-slate-700">
                  {message.author}
                </p>
                <p className="text-xs text-slate-400">
                  {message.createdAt.toLocaleString()}
                </p>
              </div>

              <p className="text-sm leading-6 text-slate-700">{message.body}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Customer</h2>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Name</p>
            <p className="font-medium text-slate-900">{ticket.customer.name}</p>
          </div>

          <div>
            <p className="text-slate-500">Email</p>
            <p className="font-medium text-slate-900">
              {ticket.customer.email}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Priority</p>
            <p className="font-medium capitalize text-slate-900">
              {ticket.priority}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
