import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import crypto from "crypto";
import { getEmailConfigById } from "@/features/email/services/email-config-service";
import { ensureDefaultOrganization } from "@/features/organizations/services/organization-service";
import { processInboundEmail } from "@/features/tickets/services/email-ingestion-service";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_WEBHOOK_BYTES = 1_000_000;

const inboundEmailSchema = z.object({
  mailboxId: z.string().min(1),
  from: z.string().email(),
  fromName: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  messageId: z.string().min(1),
  inReplyTo: z.string().optional(),
});

function verifySignature(payload: string, signature?: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > MAX_WEBHOOK_BYTES) {
      throw new Error("Webhook payload is too large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const rawBody = await readRawBody(req);
    const signatureHeader = req.headers["x-webhook-signature"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!verifySignature(rawBody, signature)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ message: "Invalid JSON payload" });
    }

    const result = inboundEmailSchema.safeParse(payload);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    const mailbox = await getEmailConfigById(result.data.mailboxId);
    if (!mailbox || !mailbox.isActive) {
      return res.status(404).json({ message: "Mailbox not found" });
    }

    const organizationId =
      mailbox.organizationId ?? (await ensureDefaultOrganization()).id;

    const ingestionResult = await processInboundEmail({
      ...result.data,
      organizationId,
    });

    return res.status(200).json({ data: ingestionResult });
  } catch (error) {
    console.error("Failed to process inbound email", error);

    const message =
      error instanceof Error && error.message === "Webhook payload is too large"
        ? error.message
        : "Failed to process inbound email";

    return res.status(
      message === "Webhook payload is too large" ? 413 : 500,
    ).json({ message });
  }
}
