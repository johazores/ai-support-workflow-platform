import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getAllTags, createTag } from "@/features/tags/services/tag-service";

const createTagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().min(1).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const tags = await getAllTags();
    return res.status(200).json({ data: tags });
  }

  if (req.method === "POST") {
    const result = createTagSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const tag = await createTag(result.data);
      return res.status(201).json({ data: tag });
    } catch (error) {
      console.error("Failed to create tag", error);
      return res.status(500).json({ message: "Failed to create tag" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
