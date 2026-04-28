export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
};

export type SendEmailResult = {
  messageId: string;
};

export type EmailProvider = {
  send(input: SendEmailInput): Promise<SendEmailResult>;
};

/**
 * Console-log provider for development — prints emails to stdout
 * instead of actually sending them.
 */
const consoleProvider: EmailProvider = {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const messageId = `dev-${Date.now()}@localhost`;

    console.log("──── Outbound Email ────");
    console.log(`To:      ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    if (input.inReplyTo) {
      console.log(`In-Reply-To: ${input.inReplyTo}`);
    }
    console.log(`Body:\n${input.body}`);
    console.log("────────────────────────");

    return { messageId };
  },
};

export function getEmailProvider(): EmailProvider {
  return consoleProvider;
}
