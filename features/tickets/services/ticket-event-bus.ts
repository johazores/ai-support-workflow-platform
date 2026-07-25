export type TicketEvent = {
  name: string;
  data: unknown;
};

type TicketEventListener = (event: TicketEvent) => void;

const listenersByTicket = new Map<string, Set<TicketEventListener>>();

export function publishTicketEvent(
  ticketId: string,
  name: string,
  data: unknown,
) {
  const listeners = listenersByTicket.get(ticketId);
  if (!listeners) return;

  const event: TicketEvent = { name, data };
  for (const listener of listeners) listener(event);
}

export function subscribeTicketEvents(
  ticketId: string,
  listener: TicketEventListener,
) {
  let listeners = listenersByTicket.get(ticketId);
  if (!listeners) {
    listeners = new Set();
    listenersByTicket.set(ticketId, listeners);
  }

  listeners.add(listener);

  return () => {
    const current = listenersByTicket.get(ticketId);
    if (!current) return;

    current.delete(listener);
    if (current.size === 0) listenersByTicket.delete(ticketId);
  };
}
