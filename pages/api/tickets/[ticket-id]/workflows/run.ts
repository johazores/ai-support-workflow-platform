import type { NextApiRequest, NextApiResponse } from "next";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:assign");
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  try {
    const result = await executeWorkflowRules(ticketId, {
      organizationId: auth.user.organizationId,
      triggerType: "manual",
    });

    if (result.message === "Ticket not found.") {
      return res.status(404).json({ message: result.message });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error("Failed to execute workflows", error);
    return res.status(500).json({ message: "Failed to execute workflows" });
  }
}
