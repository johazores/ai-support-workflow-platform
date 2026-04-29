import Imap from "imap";
import { simpleParser } from "mailparser";
import type { EmailConfig } from "@prisma/client";
import {
  getActiveEmailConfigs,
  getEmailConfig,
  getEmailConfigById,
} from "@/features/email/services/email-config-service";
import { processInboundEmail } from "@/features/tickets/services/email-ingestion-service";

type PollResult = {
  mailboxId: string;
  mailboxName: string;
  processed: number;
  error?: string;
};

/**
 * Polls all active IMAP mailboxes for unseen messages.
 * Returns per-mailbox results for visibility into failures.
 */
export async function pollAllInboxes(): Promise<PollResult[]> {
  const configs = await getActiveEmailConfigs();

  if (configs.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const processed = await pollSingleInbox(config);
      return {
        mailboxId: config.id,
        mailboxName: config.name,
        processed,
      };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          mailboxId: configs[i].id,
          mailboxName: configs[i].name,
          processed: 0,
          error: r.reason instanceof Error ? r.reason.message : "Unknown error",
        },
  );
}

/**
 * Polls a single IMAP inbox by mailbox ID.
 */
export async function pollInboxById(
  mailboxId: string,
): Promise<{ processed: number }> {
  const config = await getEmailConfigById(mailboxId);
  if (!config || !config.isActive) {
    return { processed: 0 };
  }
  const processed = await pollSingleInbox(config);
  return { processed };
}

/**
 * @deprecated Use pollAllInboxes() or pollInboxById() instead.
 * Polls the default mailbox (backward-compatible).
 */
export async function pollInbox(): Promise<{ processed: number }> {
  const config = await getEmailConfig();
  if (!config || !config.isActive) {
    return { processed: 0 };
  }
  const processed = await pollSingleInbox(config);
  return { processed };
}

/** Internal: polls a single IMAP mailbox config. */
function pollSingleInbox(config: EmailConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.imapUser,
      password: config.imapPass,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    let processed = 0;

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        imap.search(["UNSEEN"], (searchErr, uids) => {
          if (searchErr) {
            imap.end();
            return reject(searchErr);
          }

          if (!uids || uids.length === 0) {
            imap.end();
            return resolve(0);
          }

          const fetch = imap.fetch(uids, { bodies: "", markSeen: true });

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser(stream as unknown as import("stream").Readable)
                .then(async (parsed) => {
                  const from = parsed.from?.value?.[0];
                  if (!from?.address) return;

                  await processInboundEmail({
                    from: from.address,
                    fromName: from.name || from.address.split("@")[0],
                    subject: parsed.subject || "(no subject)",
                    body: parsed.text || parsed.html || "",
                    messageId: parsed.messageId || crypto.randomUUID(),
                    inReplyTo: parsed.inReplyTo || undefined,
                    mailboxId: config.id,
                  });

                  processed++;
                })
                .catch((parseErr) => {
                  console.error("Failed to parse email:", parseErr);
                });
            });
          });

          fetch.once("end", () => {
            imap.end();
          });
        });
      });
    });

    imap.once("error", reject);
    imap.once("end", () => resolve(processed));
    imap.connect();
  });
}
