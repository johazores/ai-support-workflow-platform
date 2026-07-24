import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  createOrganizationInvitation,
  listOrganizationInvitations,
} from "@/features/organizations/services/organization-invitation-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["admin", "supervisor", "agent"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(req, res, "users:manage");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const invitations = await listOrganizationInvitations(
      auth.user.organizationId,
    );
    return res.status(200).json({ data: invitations });
  }

  if (req.method === "POST") {
    const parsed = createInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const result = await createOrganizationInvitation({
        organizationId: auth.user.organizationId,
        invitedByUserId: auth.user.id,
        email: parsed.data.email,
        role: parsed.data.role,
      });
      return res.status(201).json({ data: result });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "User already belongs to organization" ||
          error.message === "Invitation already pending"
        ) {
          return res.status(409).json({ message: error.message });
        }

        if (error.message === "Organization not found") {
          return res.status(404).json({ message: error.message });
        }
      }

      console.error("Failed to create organization invitation", error);
      return res.status(500).json({ message: "Failed to invite member" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
