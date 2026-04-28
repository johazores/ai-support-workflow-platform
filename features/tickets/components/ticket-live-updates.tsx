"use client";

import { useTicketEvents } from "@/lib/use-ticket-events";
import { useRouter } from "next/navigation";

type TicketLiveUpdatesProps = {
  ticketId: string;
};

export function TicketLiveUpdates({ ticketId }: TicketLiveUpdatesProps) {
  const router = useRouter();

  useTicketEvents({
    ticketId,
    onEvent: () => {
      router.refresh();
    },
  });

  return null;
}
