import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  getUserById,
  removeUserFromOrganization,
  updateUserRole,
} from "@/features/auth/services/user-management-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "supervisor", "agent"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(req, res, "users:manage");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  if (req.method === "GET") {
    const user = await getUserById(auth.user.organizationId, id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ data: user });
  }

  if (req.method === "PATCH") {
    const result = updateRoleSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    if (id === auth.user.id) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    try {
      const user = await updateUserRole({
        organizationId: auth.user.organizationId,
        actorUserId: auth.user.id,
        id,
        role: result.data.role,
      });
      return res.status(200).json({ data: user });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "User not found") {
          return res.status(404).json({ message: error.message });
        }

        if (
          error.message === "Organization must keep at least one active admin"
        ) {
          return res.status(409).json({ message: error.message });
        }
      }

      console.error("Failed to update organization user", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  }

  if (req.method === "DELETE") {
    if (id === auth.user.id) {
      return res
        .status(400)
        .json({ message: "Cannot remove your own account" });
    }

    try {
      await removeUserFromOrganization({
        organizationId: auth.user.organizationId,
        actorUserId: auth.user.id,
        id,
      });
      return res.status(204).end();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "User not found") {
          return res.status(404).json({ message: error.message });
        }

        if (
          error.message === "Organization must keep at least one active admin"
        ) {
          return res.status(409).json({ message: error.message });
        }
      }

      console.error("Failed to remove organization user", error);
      return res.status(500).json({ message: "Failed to remove user" });
    }
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
