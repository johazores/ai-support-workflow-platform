import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updatePrioritySchema = z.object({
  priority: z.enum(["low", "normal", "high"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  const parsed = updatePrioritySchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority: parsed.data.priority },
  });

  await prisma.activityLog.create({
    data: {
      ticketId,
      type: "priority_changed",
      message: `Priority changed to ${parsed.data.priority}`,
    },
  });

  return res.status(200).json({ data: ticket });
}
