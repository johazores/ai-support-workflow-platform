import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { loginRootAdmin } from "@/features/root-auth/services/root-auth-service";

const schema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(512),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login request" });
  }

  const result = await loginRootAdmin(parsed.data, req, res);
  if (!result.ok) {
    return res.status(result.reason === "locked" ? 429 : 401).json({
      message:
        result.reason === "locked"
          ? "Too many failed attempts. Try again later."
          : "Invalid username or password",
    });
  }

  return res.status(200).json({ data: result.rootAdmin });
}
