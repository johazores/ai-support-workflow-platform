import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import crypto from "crypto";
import { processInboundEmail } from "@/features/tickets/services/email-ingestion-service";

const inboundEmailSchema = z.object({
  from: z.string().email(),
  fromName: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  messageId: z.string().min(1),
  inReplyTo: z.string().optional(),
});

function verifySignature(
  payload: string,
  signature: string | undefined,
): boolean {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) return false;
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Verify HMAC signature
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers["x-webhook-signature"] as string | undefined;

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  const result = inboundEmailSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const ingestionResult = await processInboundEmail(result.data);

    return res.status(200).json({ data: ingestionResult });
  } catch (error) {
    console.error("Failed to process inbound email", error);

    return res.status(500).json({ message: "Failed to process inbound email" });
  }
}
