import { requireUser } from "@/features/auth/services/auth-guard-service";
import Link from "next/link";
import { TicketDetail } from "@/features/tickets/components/ticket-detail";
import { AppHeader } from "@/components/layout/app-header";
type TicketPageProps = {
  params: Promise<{
    "ticket-id": string;
  }>;
};

export default async function TicketPage({ params }: TicketPageProps) {
  const user = await requireUser();
  const resolvedParams = await params;

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <Link
            href="/inbox"
            className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Back to inbox
          </Link>

          <TicketDetail ticketId={resolvedParams["ticket-id"]} />
        </section>
      </main>
    </>
  );
}
