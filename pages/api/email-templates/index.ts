import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  listEmailTemplates,
  createEmailTemplate,
} from "@/features/email/services/email-template-service";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const templates = await listEmailTemplates();
    return res.status(200).json({ data: templates });
  }

  if (req.method === "POST") {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const template = await createEmailTemplate(parsed.data);
    return res.status(201).json({ data: template });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
