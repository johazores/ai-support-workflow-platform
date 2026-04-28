import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  getUserById,
  updateUserRole,
  deleteUser,
} from "@/features/auth/services/user-management-service";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "supervisor", "agent"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "users:manage");
  if (!auth.ok) return;

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  if (req.method === "GET") {
    const user = await getUserById(id);

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

    // Prevent self-demotion
    if (id === auth.user.id) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    try {
      const user = await updateUserRole(id, result.data.role);
      return res.status(200).json({ data: user });
    } catch {
      return res.status(404).json({ message: "User not found" });
    }
  }

  if (req.method === "DELETE") {
    // Prevent self-deletion
    if (id === auth.user.id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    try {
      await deleteUser(id);
      return res.status(204).end();
    } catch {
      return res.status(404).json({ message: "User not found" });
    }
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
