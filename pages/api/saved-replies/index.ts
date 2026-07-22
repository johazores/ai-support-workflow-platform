import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  getAllSavedReplies,
  createSavedReply,
} from "@/features/saved-replies/services/saved-reply-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(50_000),
  shortcut: z.string().trim().max(30).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const auth = await requireTenantApiPermission(
      req,
      res,
      "saved-replies:read",
    );
    if (!auth.ok) return;

    const replies = await getAllSavedReplies(auth.user.organizationId);
    return res.status(200).json({ data: replies });
  }

  if (req.method === "POST") {
    const auth = await requireTenantApiPermission(
      req,
      res,
      "saved-replies:manage",
    );
    if (!auth.ok) return;

    const result = createSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const reply = await createSavedReply({
        ...result.data,
        organizationId: auth.user.organizationId,
      });
      return res.status(201).json({ data: reply });
    } catch (error) {
      console.error("Failed to create saved reply", error);
      return res.status(500).json({ message: "Failed to create saved reply" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
