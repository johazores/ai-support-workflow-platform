import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const bulkSchema = z.object({
  ticketIds: z.array(z.string()).min(1).max(50),
  action: z.enum(["change-status", "change-priority", "assign"]),
  value: z.string().min(1),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  const { ticketIds, action, value } = parsed.data;

  let data: Record<string, string> = {};
  let logMessage = "";

  switch (action) {
    case "change-status":
      data = { status: value };
      logMessage = `Bulk status changed to ${value}`;
      break;
    case "change-priority":
      data = { priority: value };
      logMessage = `Bulk priority changed to ${value}`;
      break;
    case "assign":
      data = { assigneeName: value };
      logMessage = `Bulk assigned to ${value}`;
      break;
  }

  await prisma.ticket.updateMany({
    where: { id: { in: ticketIds } },
    data,
  });

  await prisma.activityLog.createMany({
    data: ticketIds.map((ticketId) => ({
      ticketId,
      type: `bulk_${action.replace("-", "_")}`,
      message: logMessage,
    })),
  });

  return res.status(200).json({ data: { updated: ticketIds.length } });
}
