# Roadmap

The project is evolving toward a production-focused, multi-tenant support platform while keeping feature ownership and runtime configuration understandable.

## Implemented foundations

### Support operations

- Searchable inbox and complete ticket conversations.
- Status, priority, assignment, tags, internal notes, activity history, and bulk operations.
- Customer history, saved replies, SLA policies, analytics, audit logs, and CSAT.
- Server-sent ticket updates and database-backed notifications.

### AI assistance

- Tone-aware draft generation.
- Database-managed provider configuration and fallback order.
- OpenAI-compatible, Anthropic, Gemini, and controlled mock-provider support.
- Usage, latency, failure, and provider attempt logging.

### Workflow automation

- Structured triggers and actions.
- Versioned workflow definitions.
- Durable execution and step records.
- Manual and event-driven execution.
- Idempotency and execution inspection.

### Email integration

- Multiple tenant-owned SMTP and IMAP mailboxes.
- Parallel inbox polling and inbound ticket ingestion.
- Threaded outbound delivery through the originating mailbox.
- Encrypted mailbox credentials.
- Signed inbound email webhooks.
- Email templates and delivery logs.

### Administration and security

- Product-user roles and permissions.
- Organization management and tenant boundaries.
- Clerk as the primary product authentication provider.
- Independent Root Admin authentication and sessions.
- Database-backed runtime configuration.
- Provider connection tests, audit logs, and system health.
- Production environment validation, Docker support, and API-boundary audits.

## Current priorities

- Complete production validation for tenant isolation and permission enforcement.
- Expand integration coverage for ticket, mailbox, workflow, and authentication boundaries.
- Strengthen mailbox polling, retry, reconciliation, and operational visibility.
- Improve workflow recovery and execution diagnostics.
- Add clear deployment examples and a repeatable demo environment.
- Keep AI provider usage, failure, latency, and cost reporting actionable.
- Add API rate limiting and stronger abuse protections.

## Planned improvements

- Attachment storage, scanning, limits, and retention policies.
- Broader email-provider and inbound-webhook testing.
- More workflow triggers and actions without creating an unrestricted scripting engine.
- Improved SLA, analytics, CSAT, and operational reporting.
- Better organization onboarding and mailbox setup.
- Public API and webhook documentation when contracts stabilize.
- End-to-end coverage for critical agent and administrator workflows.

## Out of scope

- Unrestricted autonomous actions without permissions and audit records.
- Storing provider or mailbox credentials in source control.
- Combining Root Admin and product-user authentication.
- Moving administrator-managed runtime settings back into deployment variables.
- Enabling legacy product authentication in production.
