import type { NextApiRequest, NextApiResponse } from "next";
import {
  getRootTokenFromRequest,
  parseRootSession,
} from "@/features/root-auth/services/root-session-service";
import { isSameOriginMutation } from "@/lib/request-origin";

type RootAuthResult =
  | {
      ok: true;
      rootAdmin: {
        id: string;
        username: string;
        displayName: string;
        tokenId: string;
      };
    }
  | { ok: false; rootAdmin: null };

export async function requireRootApiAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<RootAuthResult> {
  if (req.method !== "GET" && !isSameOriginMutation(req)) {
    res.status(403).json({ message: "Invalid request origin" });
    return { ok: false, rootAdmin: null };
  }

  const rootAdmin = await parseRootSession(getRootTokenFromRequest(req));

  if (!rootAdmin) {
    res
      .status(401)
      .json({ message: "Root administrator authentication required" });
    return { ok: false, rootAdmin: null };
  }

  return { ok: true, rootAdmin };
}
