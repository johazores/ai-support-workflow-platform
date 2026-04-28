import { requireUser } from "@/features/auth/services/auth-guard-service";
import Link from "next/link";
import { TicketDetail } from "@/features/tickets/components/ticket-detail";

type TicketPageProps = {
  params: Promise<{
    "ticket-id": string;
  }>;
};

export default async function TicketPage({ params }: TicketPageProps) {
  await requireUser();
  const resolvedParams = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/inbox"
          className="mb-6 inline-flex text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to inbox
        </Link>

        <TicketDetail ticketId={resolvedParams["ticket-id"]} />
      </section>
    </main>
  );
}
