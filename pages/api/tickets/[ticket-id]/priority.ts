import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { updateTicketPriority } from "@/features/tickets/services/ticket-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const updatePrioritySchema = z.object({
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:assign");
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  const parsed = updatePrioritySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const ticket = await updateTicketPriority(
      ticketId,
      parsed.data.priority,
      auth.user.organizationId,
    );
    return res.status(200).json({ data: ticket });
  } catch (error) {
    if (error instanceof Error && error.message === "Ticket not found") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to update ticket priority", error);
    return res.status(500).json({ message: "Failed to update ticket priority" });
  }
}
