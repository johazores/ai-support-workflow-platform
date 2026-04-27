import type { NextApiRequest, NextApiResponse } from "next";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const ticketId = req.query["ticket-id"];

  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  try {
    const result = await executeWorkflowRules(ticketId);

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error("Failed to execute workflows", error);

    return res.status(500).json({
      message: "Failed to execute workflows",
    });
  }
}
