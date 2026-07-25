import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { WorkflowDefinitionError } from "@/features/workflows/services/workflow-definition-validation";
import {
  testLatestWorkflowDraftForTicket,
  WorkflowExecutionError,
} from "@/features/workflows/services/versioned-workflow-runtime";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const testSchema = z.object({
  ticketId: z.string().trim().min(1).max(100),
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

  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const execution = await testLatestWorkflowDraftForTicket({
      organizationId: auth.user.organizationId,
      workflowId: id,
      ticketId: parsed.data.ticketId,
      idempotencyKey: `test:${auth.user.id}:${randomUUID()}`,
    });

    return res.status(200).json({ data: execution });
  } catch (error) {
    if (error instanceof WorkflowDefinitionError) {
      return res.status(400).json({
        message: "Draft is not ready to test",
        issues: error.issues,
      });
    }

    if (error instanceof WorkflowExecutionError) {
      return res.status(422).json({
        message: error.message,
        executionId: error.executionId,
      });
    }

    if (
      error instanceof Error &&
      [
        "Workflow not found",
        "Workflow version not found",
        "Ticket not found",
      ].includes(error.message)
    ) {
      return res.status(404).json({ message: error.message });
    }

    console.error("Failed to test workflow draft", error);
    return res.status(500).json({ message: "Workflow test failed" });
  }
}
