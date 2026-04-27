import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie } from "@/features/auth/services/session-service";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  clearSessionCookie(res);

  return res.status(200).json({
    message: "Logged out.",
  });
}
