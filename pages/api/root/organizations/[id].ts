import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireRootApiAuth } from "@/lib/root-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { updateOrganizationStatus } from "@/features/organizations/services/root-organization-service";

const schema = z.object({ status: z.enum(["active", "suspended"]) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireRootApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid organization status" });
  }

  try {
    const organization = await updateOrganizationStatus(id, parsed.data.status);
    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: auth.rootAdmin.id,
      action: "organization.status-updated",
      targetType: "Organization",
      targetId: organization.id,
      metadata: { status: organization.status },
    });
    return res.status(200).json({ data: organization });
  } catch {
    return res.status(404).json({ message: "Organization not found" });
  }
}
