import type { NextApiRequest, NextApiResponse } from "next";
import { requireRootApiAuth } from "@/lib/root-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { deleteSystemSetting } from "@/features/system-settings/services/system-setting-service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireRootApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid setting ID" });
  }

  try {
    const setting = await deleteSystemSetting(id);
    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: auth.rootAdmin.id,
      action: "system-setting.deleted",
      targetType: "SystemSetting",
      targetId: id,
      metadata: { key: setting.key },
    });
    return res.status(200).json({ data: { deleted: true } });
  } catch {
    return res.status(404).json({ message: "Setting not found" });
  }
}
