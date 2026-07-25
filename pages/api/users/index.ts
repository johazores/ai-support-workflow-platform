import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  createUser,
  listUsers,
} from "@/features/auth/services/user-management-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "supervisor", "agent"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(req, res, "users:manage");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const users = await listUsers(auth.user.organizationId);
    return res.status(200).json({ data: users });
  }

  if (req.method === "POST") {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const user = await createUser({
        organizationId: auth.user.organizationId,
        actorUserId: auth.user.id,
        ...result.data,
      });
      return res.status(201).json({ data: user });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "User already belongs to organization") {
          return res.status(409).json({ message: error.message });
        }

        if (error.message === "User account is inactive") {
          return res.status(400).json({ message: error.message });
        }

        if (error.message.includes("Unique constraint")) {
          return res.status(409).json({ message: "Email already in use" });
        }
      }

      console.error("Failed to add organization user", error);
      return res.status(500).json({ message: "Failed to add user" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
