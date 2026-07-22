import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getAllTags, createTag } from "@/features/tags/services/tag-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().trim().min(1).max(30).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const auth = await requireTenantApiPermission(req, res, "tickets:read");
    if (!auth.ok) return;

    const tags = await getAllTags(auth.user.organizationId);
    return res.status(200).json({ data: tags });
  }

  if (req.method === "POST") {
    const auth = await requireTenantApiPermission(
      req,
      res,
      "tickets:manage-tags",
    );
    if (!auth.ok) return;

    const result = createTagSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const tag = await createTag({
        ...result.data,
        organizationId: auth.user.organizationId,
      });
      return res.status(201).json({ data: tag });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create tag";
      return res.status(message === "Tag name already exists" ? 409 : 500).json({
        message,
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
