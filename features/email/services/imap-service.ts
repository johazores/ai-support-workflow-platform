import Imap from "imap";
import { simpleParser } from "mailparser";
import { getEmailConfig } from "@/features/email/services/email-config-service";
import { processInboundEmail } from "@/features/tickets/services/email-ingestion-service";

/**
 * Polls the IMAP inbox for unseen messages and ingests them.
 * Designed to be called periodically (e.g. via cron or API trigger).
 */
export async function pollInbox(): Promise<{ processed: number }> {
  const config = await getEmailConfig();

  if (!config || !config.isActive) {
    return { processed: 0 };
  }

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
            return resolve({ processed: 0 });
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
    imap.once("end", () => resolve({ processed }));
    imap.connect();
  });
}
