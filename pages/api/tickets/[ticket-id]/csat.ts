import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiAuth } from "@/lib/api-auth";
import {
  getCsatRating,
  submitCsatRating,
} from "@/features/csat/services/csat-service";
import { z } from "zod";

const submitSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  const { ticketId } = req.query;
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket ID" });
  }

  if (req.method === "GET") {
    const rating = await getCsatRating(ticketId);
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
      ticketId,
      parsed.data.score,
      parsed.data.comment,
    );
    return res.status(200).json({ data: rating });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
