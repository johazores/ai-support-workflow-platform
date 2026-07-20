import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { saveDraft } from "@/features/ai-drafts/services/draft-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const saveDraftSchema = z.object({
  ticketId: z.string().min(1).max(100),
  body: z.string().trim().min(1).max(50_000),
});

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

  const result = saveDraftSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const draft = await saveDraft({
      ...result.data,
      organizationId: auth.user.organizationId,
    });
    return res.status(201).json({ data: draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save draft";
    return res.status(message === "Ticket not found" ? 404 : 500).json({ message });
  }
}
