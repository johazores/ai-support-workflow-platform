import type { NextApiRequest, NextApiResponse } from "next";
import { requireRootApiAuth } from "@/lib/root-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { testProviderConnection } from "@/features/providers/services/provider-test-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireRootApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid provider ID" });
  }

  try {
    const result = await testProviderConnection(id);
    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: auth.rootAdmin.id,
      action: "provider.connection-tested",
      targetType: "Provider",
      targetId: id,
      metadata: { success: result.success },
    });

    return res.status(result.success ? 200 : 422).json({ data: result });
  } catch {
    return res.status(404).json({ message: "Provider not found" });
  }
}
