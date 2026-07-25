import { z } from "zod";
import { bulkUpdateTickets } from "@/features/tickets/services/bulk-ticket-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

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

function mapBulkError(error: unknown) {
  if (!(error instanceof Error)) return null;

  if (error.message === "One or more tickets not found") {
    return { status: 404, message: error.message };
  }

  if (
    error.message === "Assignee not found" ||
    error.message === "Assignee is not an active organization member"
  ) {
    return { status: 400, message: error.message };
  }

  return null;
}

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "tickets:write",
    schema: bulkSchema,
    rateLimit: "sensitive",
    mapError: mapBulkError,
    handle: async ({ res, user, input }) => {
      const action =
        input.action === "change-status"
          ? { type: "change-status" as const, value: input.value }
          : input.action === "change-priority"
            ? { type: "change-priority" as const, value: input.value }
            : { type: "assign" as const, value: input.value };

      const result = await bulkUpdateTickets({
        organizationId: user.organizationId,
        ticketIds: input.ticketIds,
        action,
      });

      return res.status(200).json({ data: result });
    },
    unexpectedErrorMessage: "Bulk ticket update failed",
  }),
});
