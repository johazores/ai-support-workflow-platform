# SaaS Implementation Status

This document tracks the current migration from the original single-workspace support application to a production-oriented SaaS platform.

The initial SaaS foundation from PR #3 is merged into `master`. The status below reflects the current implementation and remaining production work.

## Implemented

- Organization and membership models with a legacy default-workspace migration path
- Tenant-scoped organization listing and active organization selection with membership validation, active-organization checks, persistence, auditing, and responsive shell UI
- First-organization onboarding for Clerk-only users with concurrency-safe organization creation, admin membership provisioning, default SLA seeding, rollback, and onboarding guards
- Clerk-backed organization invitations with tenant-owned lifecycle records, seven-day expiry, verified-email acceptance, revocation, audit events, role preservation, and failure compensation
- Invitation-first team administration UI with pending/accepted/revoked/expired states and direct membership for existing active Clerk identities
- Tenant-scoped user listing, membership roles, add/reactivate flows, removal, last-admin protection, and membership-change audit events
- Inactive internal product identities remain disabled across Clerk session fallback, identity synchronization, webhook updates, and organization invitations
- Independent Root Admin authentication, sessions, lockout, revocation, and audit events
- Root Admin dashboard, provider management, encrypted environment settings, organization controls, audit logs, and system health
- AES-256-GCM encryption for provider, SMTP, IMAP, and system secrets
- Central provider catalog, credential rotation, connection testing, priority, and model configuration
- Clerk product-user authentication with sign-in, sign-up, account controls, App Router support, Pages API support, and verified lifecycle webhooks
- Legacy JWT authentication retained only as a migration fallback when Clerk is unavailable
- Tenant-aware authorization middleware for API routes and protected pages
- Tenant-scoped ticket listing, details, assignment, status, priority, replies, internal notes, tags, AI drafts, saved drafts, saved replies, and customer queries
- Tenant-scoped bulk ticket status, priority, assignment, and activity-log operations with all-or-nothing ownership checks
- Ticket status, priority, assignment, and manual tag changes now dispatch tenant-scoped `ticket-updated` workflow events without turning automation failures into false mutation failures
- Tenant-scoped notifications, mailbox configuration, email templates, delivery logs, IMAP polling, and inbound email processing
- Tenant-scoped analytics counts, trends, status/priority breakdowns, and first-response metrics
- Tenant-scoped CSAT reads, submissions, and aggregate statistics with ticket ownership enforcement
- Tenant-scoped SLA ticket status, policy listing/editing, default-policy seeding, and policy-change audit events
- Raw-body HMAC verification and mailbox-to-organization routing for inbound email webhooks
- Real tenant-aware SMTP delivery for manual replies and saved AI drafts, including threading and delivery-failure rollback
- Durable workflow execution records, step records, execution inspection, idempotency, and failure reporting
- Tenant-isolated legacy workflow rule reads, mutations, execution, actions, assignee membership checks, and execution-history metadata
- Versioned workflow graph schema and node registry with strict draft/publish validation, cycle detection, tenant-safe action configuration, and explicit true/false condition branches
- Immutable published workflow versions with editable newer drafts, publish-pointer compensation, version history, and tenant-scoped create/read/save/publish/archive APIs
- Published graph runtime for manual, ticket-created, ticket-updated, and message-received triggers with persisted step history, tenant-safe status/priority/assignment/tag actions, AI draft generation, and event-level idempotency checks
- Visual workflow builder with draggable canvas nodes, inspector, explicit condition branches, validation feedback, debounced autosave, undo/redo, version history, manual published-run panel, and execution-history links
- Inbound legacy/versioned automations run sequentially so ticket-created and message-received workflows cannot race on the same new ticket; workflow failures do not lose ingested email
- Legacy null workflow/tag/SLA records exposed only through the deterministic default-workspace migration path
- Tenant-aware development seed covering the default workspace, memberships, tickets, messages, workflows, and SLA policies
- Database-managed OpenAI and Anthropic configuration with explicit provider failure behavior
- Health and readiness endpoints
- Security response headers
- CI validation for Prisma, TypeScript, ESLint, Prettier, tests, and production builds
- Complete API inventory and repository-wide authorization audit
- Tenant-safe composite uniqueness for customers, tags, SLA policies, and mailboxes

## Active Migration Work

- Validate the full stacked tenant/workflow migration against a green repository quality gate
- Merge the CI baseline cleanup that removes completed one-time migration workflows
- Resolve any remaining Clerk-aware, tenant-aware, or graph-builder signature/formatting regressions surfaced by the final quality gate
- Add safe draft workflow test mode before considering create-test-publish-run complete
- Development-gate or remove the remaining legacy product-password account creation/login paths after migration compatibility is no longer required

## Remaining Product Work

- Queue-backed retries, delays, resumability, cancellation, webhook delivery, and scheduled workflow execution
- Workflow variables/transformations, delay/webhook/schedule nodes, redaction, worker-backed integration tests, and builder accessibility/viewport polish
- Stripe plans, subscriptions, usage entitlements, and billing portal
- Attachment storage and secure upload/download
- End-to-end browser tests and deployment smoke tests
- Production observability integrations and alerting
- Final documentation reconciliation, retention/deletion controls, and launch runbooks

No feature should be marked production-ready until its tenant isolation, authorization, failure states, tests, and operational behavior have been validated end-to-end.
