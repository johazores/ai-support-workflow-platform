import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/features/email/services/email-template-service";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid template ID" });
  }

  if (req.method === "PATCH") {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const template = await updateEmailTemplate(id, parsed.data);
    return res.status(200).json({ data: template });
  }

  if (req.method === "DELETE") {
    await deleteEmailTemplate(id);
    return res.status(200).json({ data: { deleted: true } });
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
