import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { setTicketTags } from "@/features/tags/services/tag-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const setTagsSchema = z.object({
  tagIds: z.array(z.string().min(1).max(100)).max(50),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(
    req,
    res,
    "tickets:manage-tags",
  );
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  const result = setTagsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    await setTicketTags(
      auth.user.organizationId,
      ticketId,
      result.data.tagIds,
    );
    return res.status(200).json({ data: { updated: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tags";
    return res.status(message === "Ticket not found" ? 404 : 422).json({ message });
  }
}
