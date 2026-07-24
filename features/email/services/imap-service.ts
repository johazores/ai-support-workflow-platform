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

/** Poll all active IMAP mailboxes owned by one organization. */
export async function pollAllInboxes(
  organizationId: string,
): Promise<PollResult[]> {
  const configs = await getActiveEmailConfigs(organizationId);

  if (configs.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const processed = await pollSingleInbox(config, organizationId);
      return {
        mailboxId: config.id,
        mailboxName: config.name,
        processed,
      };
    }),
  );

  return results.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          mailboxId: configs[index].id,
          mailboxName: configs[index].name,
          processed: 0,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
        },
  );
}

/** Poll a single IMAP inbox owned by one organization. */
export async function pollInboxById(
  organizationId: string,
  mailboxId: string,
): Promise<{ processed: number }> {
  const config = await getEmailConfigById(mailboxId, organizationId);
  if (!config || !config.isActive) {
    return { processed: 0 };
  }

  const processed = await pollSingleInbox(config, organizationId);
  return { processed };
}

/** @deprecated Use pollAllInboxes() or pollInboxById() instead. */
export async function pollInbox(
  organizationId: string,
): Promise<{ processed: number }> {
  const config = await getEmailConfig(organizationId);
  if (!config || !config.isActive) {
    return { processed: 0 };
  }

  const processed = await pollSingleInbox(config, organizationId);
  return { processed };
}

function pollSingleInbox(
  config: EmailConfig,
  organizationId: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.imapUser,
      password: config.imapPass,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
    });

    let processed = 0;
    const pending = new Set<Promise<void>>();

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
              let task: Promise<void>;
              task = simpleParser(
                stream as unknown as import("stream").Readable,
              )
                .then(async (parsed) => {
                  const from = parsed.from?.value?.[0];
                  if (!from?.address) return;

                  await processInboundEmail({
                    organizationId,
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
                  console.error(
                    `Failed to process email for mailbox ${config.id}:`,
                    parseErr,
                  );
                })
                .finally(() => {
                  pending.delete(task);
                });

              pending.add(task);
            });
          });

          fetch.once("end", async () => {
            await Promise.allSettled([...pending]);
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
