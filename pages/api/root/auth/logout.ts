import type { NextApiRequest, NextApiResponse } from "next";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import {
  clearRootSessionCookie,
  getRootTokenFromRequest,
  parseRootSession,
  revokeRootSession,
} from "@/features/root-auth/services/root-session-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = getRootTokenFromRequest(req);
  const identity = await parseRootSession(token);
  await revokeRootSession(token);
  clearRootSessionCookie(res);

  if (identity) {
    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: identity.id,
      action: "root.logout",
    });
  }

  return res.status(200).json({ data: { loggedOut: true } });
}
