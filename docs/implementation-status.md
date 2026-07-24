# SaaS Implementation Status

This document tracks the current migration from the original single-workspace support application to a production-oriented SaaS platform.

The initial SaaS foundation from PR #3 is merged into `master`. The status below reflects the current implementation and remaining production work.

## Implemented

- Organization and membership models with a legacy default-workspace migration path
- Independent Root Admin authentication, sessions, lockout, revocation, and audit events
- Root Admin dashboard, provider management, encrypted environment settings, organization controls, audit logs, and system health
- AES-256-GCM encryption for provider, SMTP, IMAP, and system secrets
- Central provider catalog, credential rotation, connection testing, priority, and model configuration
- Clerk product-user authentication with sign-in, sign-up, account controls, App Router support, Pages API support, and verified lifecycle webhooks
- Legacy JWT authentication retained only as a migration fallback when Clerk is unavailable
- Tenant-aware authorization middleware for API routes and protected pages
- Tenant-scoped ticket listing, details, assignment, status, priority, replies, internal notes, tags, AI drafts, saved drafts, saved replies, and customer queries
- Tenant-scoped bulk ticket status, priority, assignment, and activity-log operations with all-or-nothing ownership checks
- Tenant-scoped notifications, mailbox configuration, email templates, delivery logs, IMAP polling, and inbound email processing
- Tenant-scoped analytics counts, trends, status/priority breakdowns, and first-response metrics
- Tenant-scoped CSAT reads, submissions, and aggregate statistics with ticket ownership enforcement
- Raw-body HMAC verification and mailbox-to-organization routing for inbound email webhooks
- Real tenant-aware SMTP delivery for manual replies and saved AI drafts, including threading and delivery-failure rollback
- Durable workflow execution records, step records, execution inspection, idempotency, and failure reporting
- Tenant-isolated workflow rule reads, mutations, execution, actions, assignee membership checks, and execution-history metadata
- Legacy null workflow/tag records exposed only through the deterministic default-workspace migration path
- Database-managed OpenAI and Anthropic configuration with explicit provider failure behavior
- Health and readiness endpoints
- Security response headers
- CI validation for Prisma, TypeScript, ESLint, Prettier, tests, and production builds
- Complete API inventory and repository-wide authorization audit
- Tenant-safe composite uniqueness for customers, tags, SLA policies, and mailboxes

## Active Migration Work

- Complete tenant scoping for users and SLA paths
- Resolve tests affected by Clerk-aware and tenant-aware service signatures
- Remove temporary migration workflows after their one-time commits complete

## Remaining Product Work

- Versioned visual workflow graph editor with drag-and-drop nodes and connections
- Queue-backed retries, delays, resumability, cancellation, and webhook delivery
- Stripe plans, subscriptions, usage entitlements, and billing portal
- Attachment storage and secure upload/download
- Complete Clerk organization onboarding and invitation flows
- End-to-end browser tests and deployment smoke tests
- Production observability integrations and alerting

No feature should be marked production-ready until its tenant isolation, authorization, failure states, tests, and operational behavior have been validated end-to-end.
