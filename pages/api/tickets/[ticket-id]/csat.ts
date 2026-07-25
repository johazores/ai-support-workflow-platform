import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  getCsatRating,
  submitCsatRating,
} from "@/features/csat/services/csat-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const submitSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const permission = req.method === "POST" ? "tickets:write" : "tickets:read";
  const auth = await requireTenantApiPermission(req, res, permission);
  if (!auth.ok) return;

  const { ticketId } = req.query;
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket ID" });
  }

  try {
    if (req.method === "GET") {
      const rating = await getCsatRating(auth.user.organizationId, ticketId);
      return res.status(200).json({ data: rating });
    }

    if (req.method === "POST") {
      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: parsed.error.flatten() });
      }

      const rating = await submitCsatRating(
        auth.user.organizationId,
        ticketId,
        parsed.data.score,
        parsed.data.comment,
      );
      return res.status(200).json({ data: rating });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Ticket not found") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to process CSAT request", error);
    return res.status(500).json({ message: "Failed to process CSAT request" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
