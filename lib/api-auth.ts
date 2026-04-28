import type { NextApiRequest, NextApiResponse } from "next";
import { parseSessionValue } from "@/features/auth/services/session-service";
import { hasPermission } from "@/features/auth/services/role-service";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthResult = { ok: true; user: SessionUser } | { ok: false; user: null };

/**
 * Authenticate an API request by verifying the session cookie JWT.
 * Returns the authenticated user or sends a 401 response.
 */
export async function requireApiAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthResult> {
  const session = await parseSessionValue(req.cookies.support_session);

  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return { ok: false, user: null };
  }

  return { ok: true, user: session };
}

/**
 * Authenticate and authorize an API request.
 * Returns the authenticated user or sends 401/403 response.
 */
export async function requireApiPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  permission: Parameters<typeof hasPermission>[1],
): Promise<AuthResult> {
  const auth = await requireApiAuth(req, res);

  if (!auth.ok) return auth;

  if (!hasPermission(auth.user.role, permission)) {
    res.status(403).json({ message: "Forbidden" });
    return { ok: false, user: null };
  }

  return auth;
}
