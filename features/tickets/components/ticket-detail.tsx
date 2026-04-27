import { StatusBadge } from "@/components/ui/status-badge";
import { getTicketById } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import { AiDraftPanel } from "@/features/ai-drafts/components/ai-draft-panel";
import { TicketStatusSelect } from "@/features/tickets/components/ticket-status-select";
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
        {ticket.drafts.length > 0 && (
          <div className="border-t bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-950">Saved Drafts</h2>

            <div className="mt-4 space-y-3">
              {ticket.drafts.map((draft) => (
                <article
                  key={draft.id}
                  className="rounded-xl border bg-white p-4 shadow-sm"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {draft.body}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Saved {draft.updatedAt.toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="space-y-6">
        <aside className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Customer</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-slate-500">Name</p>
              <p className="font-medium text-slate-900">
                {ticket.customer.name}
              </p>
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
            <TicketStatusSelect
              ticketId={ticket.id}
              status={ticket.status as TicketStatus}
            />
          </div>
        </aside>

        <AiDraftPanel
          ticketId={ticket.id}
          subject={ticket.subject}
          customerName={ticket.customer.name}
          customerMessage={ticket.messages.at(-1)?.body ?? ""}
        />
        <aside className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Activity</h2>

          <div className="mt-4 space-y-3">
            {ticket.activityLogs.length === 0 && (
              <p className="text-sm text-slate-500">No activity yet.</p>
            )}

            {ticket.activityLogs.map((log) => (
              <div key={log.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm text-slate-700">{log.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {log.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
