# Email Integration

The email subsystem is tenant-owned end to end. Mailbox configuration, IMAP polling, inbound ticket ingestion, notifications, templates, SMTP delivery, and delivery logs must always carry an organization boundary.

## Mailboxes

Each `EmailConfig` belongs to an organization and stores encrypted SMTP and IMAP credentials. Mailbox addresses are unique within an organization, not globally.

The deterministic legacy `default-workspace` may read older mailbox records whose `organizationId` is still `null`. New organizations never receive that fallback.

## Inbound IMAP

Authenticated administrators trigger polling through `POST /api/email/poll`. The API resolves the current organization through tenant authorization and only polls active mailboxes owned by that organization.

Each parsed message is passed to `processInboundEmail()` with the mailbox and organization IDs. Ingestion then:

1. rejects duplicate external message IDs within the organization;
2. finds or creates the customer within the organization;
3. resolves `In-Reply-To` only against messages in the same organization;
4. creates tenant-owned tickets and messages when a thread is not found;
5. runs classification and workflows with the same organization context; and
6. notifies only active members of that organization.

An unknown `In-Reply-To` is treated as a new ticket rather than as a reply.

## Inbound Webhook

`POST /api/webhooks/inbound-email` accepts signed JSON payloads from a trusted inbound-email provider.

Required payload fields:

```json
{
  "mailboxId": "<configured mailbox id>",
  "from": "customer@example.com",
  "fromName": "Customer Name",
  "subject": "Support request",
  "body": "Message body",
  "messageId": "provider-message-id",
  "inReplyTo": "optional-parent-message-id"
}
```

The sender must calculate an HMAC-SHA256 signature over the exact raw request body using `WEBHOOK_SECRET` and send the lowercase hexadecimal digest in `x-webhook-signature`.

The route disables Next.js body parsing so signature verification uses the original bytes. Payloads larger than 1 MB are rejected. After verification, `mailboxId` is resolved to an active mailbox and therefore to the owning organization before ingestion begins.

## Outbound SMTP

Manual replies and saved AI drafts use the tenant's configured SMTP mailbox through Nodemailer. The ticket's `mailboxId` is preferred so replies leave through the same mailbox that received the conversation; otherwise the organization's default active mailbox is used.

Outbound messages preserve email threading with `In-Reply-To` and `References` when a previous external message ID is available. Successful and failed deliveries are written to `EmailLog` with `organizationId` and `mailboxId`.

A support message is not kept in the conversation when SMTP delivery fails. Saved AI drafts remain available for retry after a failed delivery.

## Authorization

- Notification reads require `tickets:read` in the active organization.
- Email-log reads require `email-logs:read`.
- Mailbox polling and email-template mutations require `email-settings:manage`.
- All service-layer reads and writes additionally enforce organization ownership rather than relying on UI visibility.

## Security Requirements

- SMTP and IMAP secrets remain encrypted at rest.
- IMAP TLS certificate verification must not be disabled.
- Webhook signatures must be verified before JSON parsing or tenant resolution.
- Cross-organization mailbox, message, ticket, template, notification, and delivery-log access must return no data or a not-found/forbidden response.
- Provider retries must be safe because inbound external message IDs are deduplicated per organization.
