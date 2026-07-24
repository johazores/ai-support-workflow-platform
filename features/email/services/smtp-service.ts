import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  getEmailConfig,
  getEmailConfigById,
} from "@/features/email/services/email-config-service";

export async function sendEmail(opts: {
  organizationId: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  ticketId: string;
  messageId: string;
  mailboxId?: string;
  inReplyTo?: string;
}) {
  if (!opts.text && !opts.html) {
    throw new Error("Email body is required");
  }

  const config = opts.mailboxId
    ? await getEmailConfigById(opts.mailboxId, opts.organizationId)
    : await getEmailConfig(opts.organizationId);

  if (!config || !config.isActive) {
    throw new Error("Email integration is not configured or inactive");
  }

  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  try {
    const delivery = await transport.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      inReplyTo: opts.inReplyTo,
      references: opts.inReplyTo ? [opts.inReplyTo] : undefined,
    });

    await prisma.emailLog.create({
      data: {
        organizationId: opts.organizationId,
        ticketId: opts.ticketId,
        messageId: opts.messageId,
        mailboxId: config.id,
        to: opts.to,
        subject: opts.subject,
        status: "sent",
      },
    });

    return { messageId: delivery.messageId, mailboxId: config.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await prisma.emailLog.create({
      data: {
        organizationId: opts.organizationId,
        ticketId: opts.ticketId,
        messageId: opts.messageId,
        mailboxId: config.id,
        to: opts.to,
        subject: opts.subject,
        status: "failed",
        error: errorMessage,
      },
    });

    throw err;
  }
}
