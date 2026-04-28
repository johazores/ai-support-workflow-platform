import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  listUsers,
  createUser,
} from "@/features/auth/services/user-management-service";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "supervisor", "agent"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "users:manage");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const users = await listUsers();
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
      const user = await createUser(result.data);
      return res.status(201).json({ data: user });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        return res.status(409).json({ message: "Email already in use" });
      }
      console.error("Failed to create user", error);
      return res.status(500).json({ message: "Failed to create user" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
