export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type TicketSummary = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerName: string;
  customerEmail: string;
  preview: string;
  tagIds: string[];
  updatedAt: string;
};
