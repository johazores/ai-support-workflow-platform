export type TicketStatus = "open" | "pending" | "closed";

export type TicketPriority = "low" | "normal" | "high";

export type TicketSummary = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerName: string;
  customerEmail: string;
  preview: string;
  updatedAt: string;
};
