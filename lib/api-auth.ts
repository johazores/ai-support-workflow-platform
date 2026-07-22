import type { NextApiRequest, NextApiResponse } from "next";
import { getClerkApiSessionUser } from "@/features/auth/services/clerk-session-service";
import {
  parseSessionValue,
  type SessionUser,
} from "@/features/auth/services/session-service";
import { hasPermission } from "@/features/auth/services/role-service";

type AuthResult = { ok: true; user: SessionUser } | { ok: false; user: null };

/** Authenticate a product API request through Clerk or the migration JWT. */
export async function requireApiAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthResult> {
  const clerkUser = await getClerkApiSessionUser(req);
  if (clerkUser) return { ok: true, user: clerkUser };

  const legacySession = await parseSessionValue(req.cookies.support_session);
  if (!legacySession) {
    res.status(401).json({ message: "Unauthorized" });
    return { ok: false, user: null };
  }

  return { ok: true, user: legacySession };
}

/** Authenticate and authorize an API request against product-user permissions. */
export async function requireApiPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  permission: Parameters<typeof hasPermission>[1],
): Promise<AuthResult> {
  const authResult = await requireApiAuth(req, res);
  if (!authResult.ok) return authResult;

  if (!hasPermission(authResult.user.role, permission)) {
    res.status(403).json({ message: "Forbidden" });
    return { ok: false, user: null };
  }

  return authResult;
}
