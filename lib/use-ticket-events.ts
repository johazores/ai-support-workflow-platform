"use client";

import { useEffect, useCallback, useRef } from "react";

type TicketEvent = {
  type: string;
  data: unknown;
};

type UseTicketEventsOptions = {
  ticketId: string;
  onEvent: (event: TicketEvent) => void;
};

export function useTicketEvents({ ticketId, onEvent }: UseTicketEventsOptions) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/tickets/${ticketId}/events`,
    );

    eventSource.addEventListener("message-created", (e) => {
      onEventRef.current({ type: "message-created", data: JSON.parse(e.data) });
    });

    eventSource.addEventListener("status-changed", (e) => {
      onEventRef.current({ type: "status-changed", data: JSON.parse(e.data) });
    });

    eventSource.addEventListener("ticket-assigned", (e) => {
      onEventRef.current({ type: "ticket-assigned", data: JSON.parse(e.data) });
    });

    return () => {
      eventSource.close();
    };
  }, [ticketId]);
}

/**
 * Hook that triggers a page refresh when any ticket event is received.
 */
export function useTicketAutoRefresh(ticketId: string) {
  const refresh = useCallback(() => {
    // Use Next.js router refresh to re-fetch server components
    window.location.reload();
  }, []);

  useTicketEvents({
    ticketId,
    onEvent: refresh,
  });
}
