import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getEmailConfig } from "@/features/email/services/email-config-service";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  ticketId: string;
  messageId: string;
}) {
  const config = await getEmailConfig();

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
    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    await prisma.emailLog.create({
      data: {
        ticketId: opts.ticketId,
        messageId: opts.messageId,
        to: opts.to,
        subject: opts.subject,
        status: "sent",
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await prisma.emailLog.create({
      data: {
        ticketId: opts.ticketId,
        messageId: opts.messageId,
        to: opts.to,
        subject: opts.subject,
        status: "failed",
        error: errorMessage,
      },
    });

    throw err;
  }
}
