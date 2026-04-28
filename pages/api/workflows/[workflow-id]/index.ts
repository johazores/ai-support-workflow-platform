import type { NextApiRequest, NextApiResponse } from "next";
import { deleteWorkflowRule } from "@/features/workflows/services/workflow-mutation-service";
import { requireApiPermission } from "@/lib/api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const workflowId = req.query["workflow-id"];

  if (typeof workflowId !== "string") {
    return res.status(400).json({ message: "Invalid workflow id" });
  }

  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  try {
    await deleteWorkflowRule({ workflowId });

    return res.status(200).json({
      message: "Workflow deleted.",
    });
  } catch (error) {
    console.error("Failed to delete workflow", error);

    return res.status(500).json({
      message: "Failed to delete workflow",
    });
  }
}
