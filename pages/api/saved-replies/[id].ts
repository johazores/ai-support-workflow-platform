import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  updateSavedReply,
  deleteSavedReply,
} from "@/features/saved-replies/services/saved-reply-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(50_000),
  shortcut: z.string().trim().max(30).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(
    req,
    res,
    "saved-replies:manage",
  );
  if (!auth.ok) return;

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid saved reply id" });
  }

  if (req.method === "PUT") {
    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const reply = await updateSavedReply({
        id,
        organizationId: auth.user.organizationId,
        ...result.data,
      });
      return res.status(200).json({ data: reply });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update saved reply";
      return res.status(message === "Saved reply not found" ? 404 : 500).json({
        message,
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      await deleteSavedReply(auth.user.organizationId, id);
      return res.status(200).json({ data: { deleted: true } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete saved reply";
      return res.status(message === "Saved reply not found" ? 404 : 500).json({
        message,
      });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
