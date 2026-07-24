import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { executePublishedWorkflowsForTicket } from "@/features/workflows/services/versioned-workflow-runtime";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const runSchema = z.object({
  ticketId: z.string().min(1),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid workflow ID" });
  }

  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const executions = await executePublishedWorkflowsForTicket({
      organizationId: auth.user.organizationId,
      ticketId: parsed.data.ticketId,
      workflowId: id,
      triggerType: "manual",
    });

    if (executions.length === 0) {
      return res.status(409).json({
        message: "Workflow is not published with a manual trigger",
      });
    }

    return res.status(200).json({ data: executions[0] });
  } catch (error) {
    if (error instanceof Error && error.message === "Ticket not found") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to run workflow", error);
    return res.status(500).json({ message: "Workflow execution failed" });
  }
}
