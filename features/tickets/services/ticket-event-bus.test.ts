import { describe, expect, it, vi } from "vitest";
import {
  publishTicketEvent,
  subscribeTicketEvents,
} from "@/features/tickets/services/ticket-event-bus";

describe("ticket event bus", () => {
  it("publishes only to listeners for the matching ticket", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = subscribeTicketEvents("ticket-1", first);
    const unsubscribeSecond = subscribeTicketEvents("ticket-2", second);

    publishTicketEvent("ticket-1", "status-changed", { status: "pending" });

    expect(first).toHaveBeenCalledWith({
      name: "status-changed",
      data: { status: "pending" },
    });
    expect(second).not.toHaveBeenCalled();

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("stops publishing after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTicketEvents("ticket-3", listener);

    unsubscribe();
    publishTicketEvent("ticket-3", "priority-changed", { priority: "high" });

    expect(listener).not.toHaveBeenCalled();
  });
});
