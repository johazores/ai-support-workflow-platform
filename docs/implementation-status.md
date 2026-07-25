# SaaS Implementation Status

This document tracks the current migration from the original single-workspace support application to a production-oriented SaaS platform.

The SaaS foundation and the tenant/security/workflow increments through the current merged `master` are reflected below. Items are marked implemented only when the connected behavior exists in code; remaining work stays explicit.

## Implemented

### Identity, tenancy, and API security

- Organization and membership models with a controlled deterministic legacy default-workspace migration path
- Tenant-scoped organization listing and active organization selection with membership validation, active-organization checks, persistence, auditing, and responsive shell UI
- First-organization onboarding for Clerk-only users with concurrency-safe organization creation, admin membership provisioning, default SLA seeding, rollback, and onboarding guards
- Clerk-backed organization invitations with tenant-owned lifecycle records, seven-day expiry, verified-email acceptance, revocation, audit events, role preservation, and failure compensation
- Invitation-first team administration UI with pending/accepted/revoked/expired states and direct membership for existing active Clerk identities
- Tenant-scoped user listing, membership roles, add/reactivate flows, removal, last-admin protection, and membership-change audit events
- Inactive internal product identities remain disabled across Clerk identity synchronization, webhook updates, invitations, and session resolution
- Clerk-exclusive production product API authentication; the historical `support_session` cookie is accepted only when Clerk is absent and the explicit non-production migration gate is enabled
- Independent Root Admin authentication, sessions, lockout, revocation, and audit events
- Standard tenant API boundary with request IDs, same-origin mutation checks, active-organization authorization, permissions, Zod validation, normalized errors, and IP/identity/organization rate limiting
- Standard pre-tenant product identity API boundary for organization listing, organization selection, and first-workspace onboarding
- Root Admin browser mutations protected by same-origin checks and Root-specific rate limiting; Root login also has sensitive IP throttling
- Repository-wide Pages API deny-by-default inventory and CI audit that reject direct product-auth helpers or unclassified product routes
- Security response headers
- Tenant-safe composite uniqueness for customers, tags, SLA policies, and mailboxes

### Support product and email

- Tenant-scoped ticket listing, details, assignment, status, priority, replies, internal notes, tags, AI drafts, saved drafts, saved replies, and customer queries
- Tenant-scoped bulk ticket status, priority, assignment, and activity-log operations with all-or-nothing ownership checks
- Tenant-scoped notifications, mailbox configuration, email templates, delivery logs, IMAP polling, and inbound email processing
- Tenant-scoped analytics counts, trends, status/priority breakdowns, and first-response metrics
- Tenant-scoped CSAT reads, submissions, and aggregate statistics with ticket ownership enforcement
- Tenant-scoped SLA ticket status, policy listing/editing, default-policy seeding, and policy-change audit events
- Raw-body HMAC verification and mailbox-to-organization routing for inbound email webhooks
- Real tenant-aware SMTP delivery for manual replies and saved AI drafts, including threading and delivery-failure rollback
- Customer, saved-reply, draft-save, and internal-note legacy-null compatibility paths restricted to the deterministic legacy workspace
- Authenticated ticket Server-Sent Events with tenant ticket ownership verification and a feature-level in-process event bus

### Workflow platform

- Workflow, version, execution, and execution-step models
- Tenant-isolated legacy workflow rule reads, mutations, execution, actions, assignee membership checks, and execution-history metadata
- Versioned workflow graph schema and node registry with strict draft/publish validation, cycle detection, tenant-safe action configuration, and explicit true/false condition branches
- Immutable published workflow versions with editable newer drafts, publish-pointer compensation, version history, and tenant-scoped create/read/save/publish/archive APIs
- Published graph runtime for manual, ticket-created, ticket-updated, and message-received triggers with persisted step history, tenant-safe status/priority/assignment/tag actions, AI draft generation, and event-level idempotency checks
- Safe latest-draft workflow test mode that persists test execution/step history while simulating ticket/action effects without live ticket, activity, AI-provider, email, or draft side effects
- Visual workflow builder with draggable canvas nodes, inspector, explicit condition branches, validation feedback, debounced autosave, undo/redo, version history, safe test panel, manual published-run panel, and execution-history links
- Ticket status, priority, assignment, and manual tag changes dispatch tenant-scoped `ticket-updated` workflow events without turning automation failures into false mutation failures
- Inbound legacy/versioned automations run sequentially so ticket-created and message-received workflows cannot race on the same new ticket; workflow failures do not lose ingested email

### Configuration and operations foundation

- Root Admin dashboard, provider management, encrypted environment settings, organization controls, audit logs, and system health
- AES-256-GCM encryption for provider, SMTP, IMAP, and system secrets
- Central provider catalog, credential rotation, connection testing, priority, model configuration, usage recording, and failure tracking
- AI draft adapters for OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Together AI, and DeepSeek using database-managed credentials/models with temporary environment migration fallbacks
- Shared prompt handling across AI adapters and actual selected-model reporting in AI/provider usage telemetry
- Health and readiness endpoints
- Single cost-conscious GitHub Actions Quality Gate covering Prisma validation, API-boundary audit, TypeScript, ESLint, Prettier, tests, and production build
- Production operations runbook covering release preparation, deployment, smoke tests, rollback, database backup/restore, credential incidents, workflow incidents, severity handling, and postmortems

## Active Implementation Work

- Reconcile `MASTER_IMPLEMENTATION_PLAN.md` phase checkboxes with the merged implementation while keeping partially completed goals open
- Make database provider priority and explicit enabled/disabled state authoritative in the AI runtime while preserving a safe environment migration path
- Expand encrypted configuration/runtime adapters for non-AI integrations such as Slack, Discord, Resend, Twilio, GitHub, Redis, and storage
- Replace synchronous/in-process workflow execution with durable queue/worker execution, retries, delays, cancellation/resume, and operational visibility
- Replace the current process-local ticket event bus when multi-instance real-time delivery is introduced
- Continue production-hardening work that is endpoint-specific and therefore not covered by the shared browser API rate limiter, including webhook replay/abuse controls where applicable

## Remaining Product Work

- Non-AI integration runtime adapters and configuration definitions beyond the existing connection-test catalog
- Workflow variables/transformations, delay/webhook/schedule nodes, execution payload redaction, real worker/database integration tests, and builder accessibility/viewport polish
- Stripe plans, subscriptions, usage entitlements, checkout, billing portal, webhook reconciliation, and customer billing UI
- Attachment storage and secure upload/download
- Mailbox diagnostics, notification preferences/channels, provider-aware AI usage/cost UI, workflow templates, and import/export
- End-to-end browser tests, deployment smoke tests, load/failure-mode testing, and performance audits
- Production observability integrations, structured logging/metrics/tracing/error tracking, alerting, and queue health visibility
- Privacy, retention, deletion, and legal product controls
- Final removal of the legacy product password/session code after migration compatibility is no longer required

No feature should be called production-ready until its tenant isolation, authorization, failure states, tests, deployment behavior, and operational recovery path have been validated end-to-end.
