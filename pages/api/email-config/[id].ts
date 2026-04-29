import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  getEmailConfigById,
  updateEmailConfig,
  deleteEmailConfig,
} from "@/features/email/services/email-config-service";

function maskPasswords<T extends Record<string, unknown>>(config: T) {
  return { ...config, smtpPass: "••••••••", imapPass: "••••••••" };
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  smtpHost: z.string().min(1).max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().min(1).max(255).optional(),
  smtpPass: z.string().min(1).max(255).optional(),
  imapHost: z.string().min(1).max(255).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  imapUser: z.string().min(1).max(255).optional(),
  imapPass: z.string().min(1).max(255).optional(),
  fromAddress: z.string().email().max(255).optional(),
  fromName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid mailbox ID" });
  }

  if (req.method === "GET") {
    const config = await getEmailConfigById(id);
    if (!config) {
      return res.status(404).json({ message: "Mailbox not found" });
    }
    return res.status(200).json({ data: maskPasswords(config) });
  }

  if (req.method === "PUT") {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    try {
      const config = await updateEmailConfig(id, parsed.data);
      return res.status(200).json({ data: maskPasswords(config) });
    } catch {
      return res.status(404).json({ message: "Mailbox not found" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await deleteEmailConfig(id);
      return res.status(200).json({ data: { deleted: true } });
    } catch {
      return res.status(404).json({ message: "Mailbox not found" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
