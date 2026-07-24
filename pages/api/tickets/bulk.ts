import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { bulkUpdateTickets } from "@/features/tickets/services/bulk-ticket-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const ticketIdsSchema = z
  .array(z.string().min(1))
  .min(1)
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Duplicate ticket IDs are not allowed",
  });

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    ticketIds: ticketIdsSchema,
    action: z.literal("change-status"),
    value: z.enum(["open", "pending", "resolved", "closed"]),
  }),
  z.object({
    ticketIds: ticketIdsSchema,
    action: z.literal("change-priority"),
    value: z.enum(["low", "normal", "high", "urgent"]),
  }),
  z.object({
    ticketIds: ticketIdsSchema,
    action: z.literal("assign"),
    value: z.string().min(1).max(320),
  }),
]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:write");
  if (!auth.ok) return;

  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  let action;
  if (parsed.data.action === "change-status") {
    action = { type: "change-status" as const, value: parsed.data.value };
  } else if (parsed.data.action === "change-priority") {
    action = { type: "change-priority" as const, value: parsed.data.value };
  } else {
    action = { type: "assign" as const, value: parsed.data.value };
  }

  try {
    const result = await bulkUpdateTickets({
      organizationId: auth.user.organizationId,
      ticketIds: parsed.data.ticketIds,
      action,
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "One or more tickets not found") {
        return res.status(404).json({ message: error.message });
      }

      if (
        error.message === "Assignee not found" ||
        error.message === "Assignee is not an active organization member"
      ) {
        return res.status(400).json({ message: error.message });
      }
    }

    console.error("Bulk ticket update failed", error);
    return res.status(500).json({ message: "Bulk ticket update failed" });
  }
}
