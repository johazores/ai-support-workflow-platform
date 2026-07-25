import type { NextApiRequest, NextApiResponse } from "next";
import { listWorkflowVersions } from "@/features/workflows/services/workflow-definition-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:read");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid workflow ID" });
  }

  try {
    const versions = await listWorkflowVersions(auth.user.organizationId, id);
    return res.status(200).json({ data: versions });
  } catch (error) {
    if (error instanceof Error && error.message === "Workflow not found") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to list workflow versions", error);
    return res.status(500).json({ message: "Failed to list workflow versions" });
  }
}
