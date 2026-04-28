import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import { updateSlaPolicy } from "@/features/sla/services/sla-service";

const updateSchema = z.object({
  firstResponseMinutes: z.number().int().min(1),
  resolutionMinutes: z.number().int().min(1),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid policy ID" });
  }

  if (req.method === "PATCH") {
    const result = updateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    // Ensure resolution >= first response
    if (result.data.resolutionMinutes < result.data.firstResponseMinutes) {
      return res.status(400).json({
        message: "Resolution time must be greater than first response time",
      });
    }

    try {
      const policy = await updateSlaPolicy(id, result.data);
      return res.status(200).json({ data: policy });
    } catch {
      return res.status(404).json({ message: "Policy not found" });
    }
  }

  res.setHeader("Allow", ["PATCH"]);
  return res.status(405).json({ message: "Method not allowed" });
}
