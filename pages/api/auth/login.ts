import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { validateUserLogin } from "@/features/auth/services/auth-service";
import {
  isLegacyProductAuthEnabled,
  legacyProductAuthDisabledMessage,
} from "@/features/auth/services/legacy-auth-config";
import { setSessionCookie } from "@/features/auth/services/session-service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!(await isLegacyProductAuthEnabled())) {
    return res.status(503).json({
      message: legacyProductAuthDisabledMessage(),
    });
  }

  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  const user = await validateUserLogin(result.data);

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  await setSessionCookie(res, user);

  return res.status(200).json({
    data: user,
  });
}
