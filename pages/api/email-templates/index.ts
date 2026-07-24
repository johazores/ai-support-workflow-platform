import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  listEmailTemplates,
  createEmailTemplate,
} from "@/features/email/services/email-template-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const permission =
    req.method === "GET" ? "email-logs:read" : "email-settings:manage";
  const auth = await requireTenantApiPermission(req, res, permission);
  if (!auth.ok) return;

  if (req.method === "GET") {
    const templates = await listEmailTemplates(auth.user.organizationId);
    return res.status(200).json({ data: templates });
  }

  if (req.method === "POST") {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const template = await createEmailTemplate({
      ...parsed.data,
      organizationId: auth.user.organizationId,
    });
    return res.status(201).json({ data: template });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
