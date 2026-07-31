import Link from "next/link";
import { TicketDetail } from "@/features/tickets/components/ticket-detail";
import { requireUser } from "@/features/auth/services/auth-guard-service";

type TicketPageProps = {
  params: Promise<{
    "ticket-id": string;
  }>;
};

export default async function TicketPage({ params }: TicketPageProps) {
  const user = await requireUser();
  const resolvedParams = await params;

  return (
    <section className="mx-auto max-w-6xl">
      <Link
        href="/inbox"
        className="mb-6 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-white"
      >
        <span aria-hidden="true">←</span>
        Back to inbox
      </Link>

      <TicketDetail
        ticketId={resolvedParams["ticket-id"]}
        organizationId={user.organizationId}
      />
    </section>
  );
}
