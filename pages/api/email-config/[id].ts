import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
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
  smtpPass: z.string().min(1).max(512).optional(),
  imapHost: z.string().min(1).max(255).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  imapUser: z.string().min(1).max(255).optional(),
  imapPass: z.string().min(1).max(512).optional(),
  fromAddress: z.string().email().max(255).optional(),
  fromName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(
    req,
    res,
    "email-settings:manage",
  );
  if (!auth.ok) return;

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid mailbox ID" });
  }

  if (req.method === "GET") {
    const config = await getEmailConfigById(id, auth.user.organizationId);
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
      const config = await updateEmailConfig(
        id,
        parsed.data,
        auth.user.organizationId,
      );

      await recordAuditEvent({
        actorType: "user",
        userId: auth.user.id,
        organizationId: auth.user.organizationId,
        action: "mailbox.updated",
        targetType: "EmailConfig",
        targetId: config.id,
        metadata: { fields: Object.keys(parsed.data) },
      });

      return res.status(200).json({ data: maskPasswords(config) });
    } catch {
      return res.status(404).json({ message: "Mailbox not found" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await deleteEmailConfig(id, auth.user.organizationId);
      await recordAuditEvent({
        actorType: "user",
        userId: auth.user.id,
        organizationId: auth.user.organizationId,
        action: "mailbox.deleted",
        targetType: "EmailConfig",
        targetId: id,
      });
      return res.status(200).json({ data: { deleted: true } });
    } catch {
      return res.status(404).json({ message: "Mailbox not found" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
