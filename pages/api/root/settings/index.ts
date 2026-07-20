import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireRootApiAuth } from "@/lib/root-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import {
  listSystemSettings,
  upsertSystemSetting,
} from "@/features/system-settings/services/system-setting-service";

const settingSchema = z.object({
  key: z.string().trim().min(1).max(150).regex(/^[a-z0-9._-]+$/),
  category: z.string().trim().min(1).max(100),
  value: z.unknown(),
  isSecret: z.boolean(),
  description: z.string().trim().max(500).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireRootApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method === "GET") {
    return res.status(200).json({ data: await listSystemSettings() });
  }

  if (req.method === "PUT") {
    const parsed = settingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid system setting",
        errors: parsed.error.flatten(),
      });
    }

    if (
      parsed.data.isSecret &&
      (typeof parsed.data.value !== "string" || !parsed.data.value.trim())
    ) {
      return res.status(400).json({ message: "Secret value is required" });
    }

    const setting = await upsertSystemSetting({
      ...parsed.data,
      updatedByRootAdminId: auth.rootAdmin.id,
    });

    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: auth.rootAdmin.id,
      action: "system-setting.updated",
      targetType: "SystemSetting",
      targetId: setting.id,
      metadata: {
        key: setting.key,
        category: setting.category,
        isSecret: setting.isSecret,
      },
    });

    return res.status(200).json({
      data: { id: setting.id, key: setting.key, updatedAt: setting.updatedAt },
    });
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ message: "Method not allowed" });
}
