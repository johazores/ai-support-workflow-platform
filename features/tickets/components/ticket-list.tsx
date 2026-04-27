import { StatusBadge } from "@/components/ui/status-badge";
import { getTicketSummaries } from "@/features/tickets/services/ticket-service";

export async function TicketList() {
  const tickets = await getTicketSummaries();

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold text-slate-950">Recent tickets</h2>
        <p className="mt-1 text-sm text-slate-500">
          Server-rendered from MongoDB through Prisma.
        </p>
      </div>

      <div className="divide-y">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">
                  {ticket.subject}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {ticket.customerName} · {ticket.customerEmail}
                </p>
              </div>

              <StatusBadge status={ticket.status} />
            </div>

            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
              {ticket.preview}
            </p>
          </article>
        ))}

        {tickets.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No tickets found. Run the seed command to add sample data.
          </div>
        )}
      </div>
    </div>
  );
}
