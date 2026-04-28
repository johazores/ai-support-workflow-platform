import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { updateWorkflowStatus } from "@/features/workflows/services/workflow-mutation-service";
import { requireApiPermission } from "@/lib/api-auth";

const updateWorkflowStatusSchema = z.object({
  isActive: z.boolean(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const workflowId = req.query["workflow-id"];

  if (typeof workflowId !== "string") {
    return res.status(400).json({ message: "Invalid workflow id" });
  }

  const result = updateWorkflowStatusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  const workflow = await updateWorkflowStatus({
    workflowId,
    isActive: result.data.isActive,
  });

  return res.status(200).json({ data: workflow });
}
