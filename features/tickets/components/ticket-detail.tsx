import { StatusBadge } from "@/components/ui/status-badge";
import { getTicketById } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import { AiDraftPanel } from "@/features/ai-drafts/components/ai-draft-panel";
import { TicketStatusSelect } from "@/features/tickets/components/ticket-status-select";
import { TicketAssigneeSelect } from "@/features/tickets/components/ticket-assignee-select";
import { RunWorkflowButton } from "@/features/workflows/components/run-workflow-button";
import { SendDraftButton } from "@/features/ai-drafts/components/send-draft-button";
import { ReplyComposer } from "@/features/tickets/components/reply-composer";
import { InternalNoteComposer } from "@/features/tickets/components/internal-note-composer";
import { TicketLiveUpdates } from "@/features/tickets/components/ticket-live-updates";
import { TagPicker } from "@/features/tags/components/tag-picker";
import { SlaCountdown } from "@/features/sla/components/sla-countdown";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
type TicketDetailProps = {
  ticketId: string;
};

export async function TicketDetail({ ticketId }: TicketDetailProps) {
  const ticket = await getTicketById(ticketId);

  if (!ticket) {
    return (
      <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-sm">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <TicketLiveUpdates ticketId={ticketId} />
      {/* Main conversation column */}
      <div className="space-y-6">
        {/* Ticket header card */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold tracking-tight text-slate-950">
                  {ticket.subject}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold uppercase text-slate-600">
                    {ticket.customer.name.charAt(0)}
                  </span>
                  <span>{ticket.customer.name}</span>
                  <span className="text-slate-300">&middot;</span>
                  <span className="text-slate-400">
                    {ticket.customer.email}
                  </span>
                </div>
              </div>

              <StatusBadge status={ticket.status as TicketStatus} />
            </div>
          </div>
        </section>

        {/* Message thread */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-6 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conversation
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {ticket.messages.map((message) => {
              const isCustomer = message.author === "customer";
              const isSupport = message.author === "support";
              const isNote = message.author === "note";

              return (
                <div
                  key={message.id}
                  className={`px-6 py-4 text-sm ${
                    isCustomer
                      ? "bg-white"
                      : isSupport
                        ? "bg-blue-50/40"
                        : "bg-amber-50/40"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold uppercase ${
                        isCustomer
                          ? "bg-slate-100 text-slate-600"
                          : isSupport
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isCustomer ? "C" : isSupport ? "S" : "N"}
                    </span>

                    <span className="text-xs font-semibold text-slate-700">
                      {isCustomer && "Customer"}
                      {isSupport && "Support"}
                      {isNote && "Internal Note"}
                    </span>

                    <span className="ml-auto text-xs text-slate-400">
                      {formatRelativeTime(String(message.createdAt))}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap pl-10 leading-relaxed text-slate-700">
                    {message.body}
                  </p>
                </div>
              );
            })}
          </div>

          {ticket.drafts.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Saved Drafts
              </h2>

              <div className="mt-4 space-y-3">
                {ticket.drafts.map((draft) => (
                  <article
                    key={draft.id}
                    className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {draft.body}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-50 pt-3">
                      <p className="text-xs text-slate-400">
                        Saved {formatDateTime(String(draft.updatedAt))}
                      </p>

                      <SendDraftButton draftId={draft.id} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Details
          </h2>

          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-slate-500">Customer</p>
              <p className="font-medium text-slate-900">
                {ticket.customer.name}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-slate-500">Email</p>
              <p className="font-medium text-slate-900">
                {ticket.customer.email}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-slate-500">Priority</p>
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                {ticket.priority}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <TicketStatusSelect
                ticketId={ticket.id}
                status={ticket.status as TicketStatus}
              />
            </div>

            <div>
              <TicketAssigneeSelect
                ticketId={ticket.id}
                assigneeEmail={ticket.assigneeEmail}
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <TagPicker ticketId={ticket.id} initialTagIds={ticket.tagIds} />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <SlaCountdown ticketId={ticket.id} />
            </div>
          </div>
        </aside>

        <ReplyComposer ticketId={ticket.id} />
        <InternalNoteComposer ticketId={ticket.id} />
        <AiDraftPanel
          ticketId={ticket.id}
          subject={ticket.subject}
          customerName={ticket.customer.name}
          customerMessage={ticket.messages.at(-1)?.body ?? ""}
        />
        <RunWorkflowButton ticketId={ticket.id} />

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Activity
          </h2>

          <div className="mt-4 space-y-3">
            {ticket.activityLogs.length === 0 && (
              <p className="text-sm text-slate-400">No activity yet.</p>
            )}

            {ticket.activityLogs.map((log) => (
              <div
                key={log.id}
                className="border-l-2 border-slate-200 pl-3 py-1"
              >
                <p className="text-sm leading-snug text-slate-700">
                  {log.message}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatRelativeTime(String(log.createdAt))}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
