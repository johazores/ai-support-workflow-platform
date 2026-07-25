import { z } from "zod";
import {
  getCsatRating,
  submitCsatRating,
} from "@/features/csat/services/csat-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const submitSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2_000).optional(),
});

function ticketIdFrom(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new TenantApiError(400, "Invalid ticket id");
  }
  return value;
}

function mapCsatError(error: unknown) {
  return error instanceof Error && error.message === "Ticket not found"
    ? { status: 404, message: error.message }
    : null;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ req, res, user }) => {
      const rating = await getCsatRating(
        user.organizationId,
        ticketIdFrom(req.query["ticket-id"]),
      );
      res.status(200).json({ data: rating });
    },
    mapError: mapCsatError,
    unexpectedErrorMessage: "Failed to load CSAT rating",
  }),

  POST: tenantApiRoute({
    permission: "tickets:write",
    schema: submitSchema,
    handle: async ({ req, res, user, input }) => {
      const rating = await submitCsatRating(
        user.organizationId,
        ticketIdFrom(req.query["ticket-id"]),
        input.score,
        input.comment,
      );
      res.status(201).json({ data: rating });
    },
    mapError: mapCsatError,
    unexpectedErrorMessage: "Failed to submit CSAT rating",
  }),
});
