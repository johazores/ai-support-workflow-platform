import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { updateSlaPolicy } from "@/features/sla/services/sla-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const updateSchema = z.object({
  firstResponseMinutes: z.number().int().min(1).max(525_600),
  resolutionMinutes: z.number().int().min(1).max(525_600),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid policy ID" });
  }

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  if (result.data.resolutionMinutes < result.data.firstResponseMinutes) {
    return res.status(400).json({
      message: "Resolution time must be greater than first response time",
    });
  }

  try {
    const policy = await updateSlaPolicy({
      organizationId: auth.user.organizationId,
      actorUserId: auth.user.id,
      id,
      data: result.data,
    });
    return res.status(200).json({ data: policy });
  } catch (error) {
    if (error instanceof Error && error.message === "Policy not found") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to update SLA policy", error);
    return res.status(500).json({ message: "Failed to update SLA policy" });
  }
}
