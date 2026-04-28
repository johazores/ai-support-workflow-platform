import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAuditLogs,
  getAuditLogTypes,
} from "@/features/audit/services/audit-service";
import { parseSessionValue } from "@/features/auth/services/session-service";
import { isElevatedRole } from "@/features/auth/services/role-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Auth check — only supervisors and admins
  const session = await parseSessionValue(req.cookies.support_session);

  if (!session || !isElevatedRole(session.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const { cursor, type, ticketId, meta } = req.query;

    // Return distinct log types for filter dropdown
    if (meta === "types") {
      const types = await getAuditLogTypes();
      return res.status(200).json({ data: types });
    }

    const result = await getAuditLogs({
      cursor: typeof cursor === "string" ? cursor : undefined,
      type: typeof type === "string" ? type : undefined,
      ticketId: typeof ticketId === "string" ? ticketId : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to fetch audit logs", error);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
}
