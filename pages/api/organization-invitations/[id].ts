import type { NextApiRequest, NextApiResponse } from "next";
import { revokeOrganizationInvitation } from "@/features/organizations/services/organization-invitation-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "users:manage");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid invitation ID" });
  }

  try {
    const invitation = await revokeOrganizationInvitation({
      organizationId: auth.user.organizationId,
      invitationId: id,
      actorUserId: auth.user.id,
    });
    return res.status(200).json({ data: invitation });
  } catch (error) {
    if (error instanceof Error && error.message === "Invitation not found") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to revoke organization invitation", error);
    return res.status(500).json({ message: "Failed to revoke invitation" });
  }
}
