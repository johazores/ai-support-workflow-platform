import type { NextApiRequest, NextApiResponse } from "next";
import {
  getRootTokenFromRequest,
  parseRootSession,
} from "@/features/root-auth/services/root-session-service";
import {
  applyRateLimitHeaders,
  enforceRequestRateLimit,
} from "@/lib/rate-limit";
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

  try {
    const rateLimit = await enforceRequestRateLimit({
      req,
      rateLimitClass: req.method === "GET" ? "read" : "write",
      identityId: rootAdmin.id,
    });
    applyRateLimitHeaders(res, rateLimit);

    if (!rateLimit.allowed) {
      res.status(429).json({ message: "Too many requests" });
      return { ok: false, rootAdmin: null };
    }
  } catch (error) {
    console.error("Root Admin API rate limiting failed", error);
    res.status(503).json({ message: "Request temporarily unavailable" });
    return { ok: false, rootAdmin: null };
  }

  return { ok: true, rootAdmin };
}
