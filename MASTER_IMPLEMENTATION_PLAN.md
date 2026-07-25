# AI Support Workflow Platform — Master Implementation Plan

Last updated: July 25, 2026

This document is the implementation source of truth for evolving the existing repository into a production-ready SaaS platform. It complements `docs/production-readiness-audit.md` and must be updated as decisions are made and work is completed.

## 1. Product Vision

Build a multi-tenant AI support and workflow automation SaaS that combines:

- a complete support inbox and ticketing workspace;
- AI-assisted support operations;
- a visual no-code workflow builder;
- durable workflow execution and observability;
- configurable integrations and provider credentials;
- tenant administration;
- an independent platform-owner Root Admin control plane;
- secure billing, audit, monitoring, and operational controls.

The existing support-domain features are the foundation. The project should evolve through focused, production-quality increments rather than a replacement rewrite.

## 2. Non-Negotiable Engineering Principles

- Review the existing implementation before changing a feature.
- Reuse existing components and services when their responsibility remains valid.
- Do not add a second implementation of the same concern.
- Prefer clear modules over abstraction-heavy frameworks.
- Keep business logic out of React components and route handlers.
- Keep tenant authorization server-side and mandatory.
- Treat every integration secret as sensitive.
- Never silently replace a real integration failure with fake success.
- Every user-facing action must complete, explain why it is unavailable, or show a recoverable failure.
- Add tests with each critical feature.
- Use focused commits with natural messages.
- Update this plan and relevant architecture documentation in the same phase as the code.

## 3. Current Foundation to Preserve

- Next.js App Router pages.
- Existing Pages Router APIs during incremental migration.
- TypeScript and Zod.
- Prisma and the current support-domain models as migration inputs.
- Feature-folder organization.
- Shared API client.
- Shared UI components and theme support.
- Inbox, ticket, reply, draft, note, tag, assignment, SLA, CSAT, customer, notification, analytics, and email concepts.
- AI provider interface and provider-chain concept.
- Existing CI and unit-test structure.

## 4. Target Route Structure

```text
app/
  (marketing)/                 Public website, pricing, legal pages
  (auth)/                      Clerk sign-in/sign-up callbacks and onboarding
  (product)/                   Tenant application shell
    inbox/
    tickets/
    workflows/
    executions/
    integrations/
    settings/
    billing/
  root/                        Independent Root Admin application
    login/
    dashboard/
    environments/
    providers/
    credentials/
    organizations/
    billing/
    feature-flags/
    audit-logs/
    system-health/
```

Existing pages should move gradually. Route movement must not break working links without redirects.

## 5. Target Authentication Architecture

### Product users

Use Clerk for:

- email/password authentication;
- social sign-in;
- email verification;
- password reset;
- session management;
- user profile management;
- application-invitation email delivery while internal organizations remain the product tenancy source of truth.

Keep an internal `User` record for product data and authorization. It should be linked by `clerkUserId` and should not store a product password hash after the legacy migration path is removed.

### Root Admin

Use a completely separate local authentication system:

- `RootAdmin` username and password hash;
- dedicated login route;
- dedicated JWT audience and issuer;
- dedicated HttpOnly cookie;
- short-lived access session;
- persisted `RootSession` records for revocation and rotation;
- lockout and throttling;
- optional TOTP/WebAuthn phase after the initial secure login;
- no dependency on Clerk availability.

### Authorization

- Product authorization resolves Clerk identity, internal user, organization membership, role, and permission.
- Root authorization resolves the local Root Admin session.
- Product and Root Admin middleware must never accept each other's cookies or tokens.

## 6. Target Tenant Model

Minimum models:

- `Organization`
- `User`
- `OrganizationMember`
- `Role`
- `RolePermission` or a well-defined permission map
- `OrganizationInvitation`

Every tenant-owned service must receive organization context explicitly.

Tenant-owned records include:

- customers;
- tickets and messages;
- workflows and executions;
- tags and saved replies;
- SLA policies;
- email/mailbox configurations;
- notifications;
- tenant integration connections;
- tenant API keys;
- billing/customer subscription data;
- audit events.

## 7. Target Configuration and Secret Architecture

### Bootstrap configuration

The deployment still requires a minimal trusted bootstrap:

- database connection;
- encryption master key or KMS identity;
- Root Admin token-signing/bootstrap secret;
- Clerk server credentials until a supported secure runtime-loading mechanism is implemented;
- hosting-specific runtime values.

### Database-managed configuration

Root Admin should manage through the UI:

- AI providers and models;
- Slack and Discord;
- SMTP, Resend, and Twilio;
- Stripe;
- GitHub;
- Redis/queue configuration;
- storage providers;
- branding and themes;
- feature flags;
- rate limits;
- logging and monitoring settings;
- email defaults;
- billing settings;
- provider priority and limits.

### Proposed models

- `SystemSetting`
- `Provider`
- `ProviderCredential`
- `ProviderModel`
- `IntegrationConnection`
- `FeatureFlag`
- `ConfigurationVersion`
- `ProviderHealthEvent`
- `ProviderUsageRecord`

### Secret handling rules

- Encrypt using authenticated encryption or external KMS envelope encryption.
- Store ciphertext, nonce, tag, and key version.
- Never return decrypted values from normal read endpoints.
- Mask configured secrets.
- Rotate without downtime.
- Audit create, update, test, rotate, reveal, disable, and delete actions.
- Redact secrets from errors, workflow payloads, and logs.

## 8. Target Workflow Architecture

### Definition layer

- `Workflow`
- `WorkflowVersion`
- validated graph definition
- draft and published versions
- trigger and node registry
- node input/output schemas
- variables and expression evaluation
- validation before publish

### Runtime layer

- `WorkflowExecution`
- `WorkflowExecutionStep`
- durable queue job identifiers
- status: queued, running, waiting, succeeded, failed, cancelled
- retries, backoff, timeout, cancellation
- idempotency keys
- delay and resumable execution
- webhook correlation
- execution logs with redaction
- test mode

### Initial node categories

Triggers:

- ticket created;
- ticket updated;
- inbound email;
- manual run;
- webhook;
- schedule.

Logic:

- condition;
- branch;
- delay;
- set variable;
- transform data.

Support actions:

- update ticket status;
- update priority;
- assign user/team;
- add/remove tag;
- create internal note;
- send reply;
- generate AI draft.

Integration actions:

- HTTP request;
- Slack message;
- Discord message;
- email;
- AI model call.

### Builder UX

- searchable node palette;
- drag-and-drop canvas;
- smooth connections and viewport controls;
- inspector panel;
- node validation;
- keyboard navigation;
- undo/redo;
- autosave;
- test/run mode;
- execution inspector;
- clear empty and failure states;
- mobile read-only experience where editing is impractical.

## 9. Target Data Model Additions

### Platform and identity

- Organization
- OrganizationMember
- OrganizationInvitation
- RootAdmin
- RootSession
- FeatureFlag
- SystemSetting
- AuditLog

### Providers and credentials

- Provider
- ProviderCredential
- ProviderModel
- ProviderHealthEvent
- ProviderUsageRecord
- IntegrationConnection
- ApiKey

### Workflows

- Workflow
- WorkflowVersion
- WorkflowExecution
- WorkflowExecutionStep
- WebhookEndpoint
- ScheduledTrigger

### Billing

- Plan
- Subscription
- BillingCustomer
- UsageMeter
- InvoiceReference
- Entitlement

### Operations

- JobRecord or queue metadata where needed
- SecurityEvent
- NotificationPreference

Existing models should be migrated to include organization ownership and stronger relations.

## 10. API and Service Standards

All protected APIs should use a common wrapper that performs:

1. method validation;
2. request correlation ID;
3. authentication;
4. tenant resolution;
5. permission authorization;
6. Zod input validation;
7. rate limiting;
8. service execution;
9. normalized response/error mapping;
10. audit/security event recording where required.

Public endpoints must be explicitly declared and protected using appropriate controls such as HMAC signatures, replay protection, origin checks, CAPTCHA, or rate limits.

Use Server Actions only where they simplify a server-rendered form without weakening API reuse, validation, or authorization.

## 11. Security Requirements

- Clerk for product identity.
- Independent Root Admin JWT sessions.
- Strong password hashing for Root Admin.
- Session revocation and rotation.
- Login throttling and temporary lockout.
- Tenant-scoped RBAC.
- Server-side authorization on every protected mutation and read.
- Encrypted integration secrets.
- Secret masking and log redaction.
- CSRF/origin protections.
- Rate limiting by IP, identity, organization, and operation class.
- Webhook signature and replay protection.
- Secure cookie flags.
- Security headers and CSP.
- Input size limits.
- Safe file handling before attachments are introduced.
- Audit logs with actor, organization, action, target, metadata, IP, user agent, and timestamp.
- Dependency and secret scanning in CI.
- Data retention and deletion policies.

## 12. Performance and Reliability Requirements

- Keep long-running AI, email, and workflow work out of interactive requests.
- Use durable jobs for workflow execution, polling, retries, and scheduled actions.
- Add Redis or another queue backend only when the worker phase begins.
- Add compound tenant indexes.
- Paginate all potentially unbounded lists.
- Use React Query for client-side server state where live mutation/refetch behavior is needed.
- Prefer Server Components for read-heavy pages.
- Lazy-load the workflow canvas and heavy editors.
- Add provider concurrency limits and circuit breakers.
- Add caching for dynamic configuration with explicit invalidation.
- Add performance budgets and bundle analysis.

## 13. Observability and Operations

- Structured logs.
- Request and execution correlation IDs.
- Error tracking.
- Metrics for API latency, queue depth, execution duration, provider success, and cost.
- Health and readiness endpoints.
- Queue/dead-letter visibility.
- Provider health dashboard.
- Audit and security-event dashboard.
- Backup and restore runbook.
- Deployment and rollback runbook.
- Database migration strategy.
- Incident-response notes.

## 14. Test Strategy

### Unit

- permission evaluation;
- encryption/decryption and rotation;
- workflow graph validation;
- expression evaluation;
- provider selection and failure behavior;
- billing entitlement checks.

### Integration

- Prisma repositories against a test database;
- tenant isolation;
- Root Admin session revocation;
- Clerk webhook/user synchronization;
- workflow execution persistence and retry behavior;
- provider credential testing;
- webhook replay protection.

### End-to-end

Use Playwright for:

- product sign-up and onboarding;
- organization creation/invitation;
- ticket workflow;
- provider connection setup;
- workflow create, test, publish, and execute;
- Root Admin login and environment management;
- billing checkout and entitlement behavior;
- permission denial and cross-tenant isolation.

## 15. UI System Direction

- Create a cohesive SaaS app shell with sidebar, top bar, organization switcher, active navigation, breadcrumbs, command/search access, notifications, and account controls.
- Preserve and improve existing UI primitives rather than replacing them with an unrelated template.
- Establish semantic design tokens for light and dark modes.
- Use a consistent icon library instead of repeated inline SVGs.
- Add accessible focus, keyboard, loading, empty, success, warning, and error states.
- Keep Root Admin visually related but clearly separated from tenant administration.
- Avoid dead controls and fake metrics.

## 16. Implementation Phases

## Phase 0 — Baseline and Guardrails

Goal: establish a verified starting point before behavior changes.

- [x] Review repository metadata, history, architecture, schema, dependencies, auth, workflows, email configuration, AI behavior, UI shell, CI, and documentation.
- [x] Add production-readiness audit.
- [x] Add this master implementation plan.
- [x] Inventory all routes and their auth/permission status.
- [ ] Inventory every page, CTA, form, service, and data source.
- [ ] Record current lint, type-check, test, and build results.
- [ ] Add a production-readiness issue/label structure if issue tracking will be used.
- [ ] Reconcile misleading production-ready claims in documentation.

Exit criteria: current behavior and gaps are documented, and the baseline checks are reproducible.

## Phase 1 — Identity, Tenancy, and Authorization

Goal: establish the security boundary all later SaaS work depends on.

- [x] Add organization and membership schema.
- [x] Add Clerk dependencies and middleware.
- [x] Link Clerk identities to internal users.
- [x] Add onboarding and organization selection.
- [x] Add tenant-aware authorization helpers.
- [x] Add separate Root Admin and Root Session models.
- [x] Add Root Admin password, JWT, cookie, revocation, and lockout services.
- [x] Add `/root/login` and protected Root Admin shell.
- [ ] Add standardized protected API wrappers.
- [ ] Migrate existing APIs to consistent authorization.
- [x] Add tenant isolation and auth tests.
- [ ] Remove or development-gate the existing product password login.

Exit criteria: Clerk users can access only their organization, Root Admin works without Clerk, and unauthorized/cross-tenant API access is covered by tests.

## Phase 2 — Encrypted Configuration Control Plane

Goal: move integration management into a secure Root Admin UI.

- [x] Add encryption service and key-version strategy.
- [ ] Add provider, credential, model, setting, feature flag, health, and usage models.
- [x] Migrate mailbox passwords to encrypted storage.
- [x] Add secret masking and credential rotation.
- [ ] Add dynamic configuration resolver and cache invalidation.
- [x] Add Root Admin environment/provider pages.
- [x] Add provider connection tests and failure tracking.
- [ ] Add OpenAI, Anthropic, Gemini, OpenRouter, Groq, Together AI, and DeepSeek adapters.
- [ ] Add Slack, Discord, SMTP, Resend, Twilio, Stripe, GitHub, Redis, database metadata, and storage configuration definitions.
- [x] Add audit events for configuration changes.
- [x] Remove production mock fallback behavior.

Exit criteria: supported providers can be configured, tested, enabled, disabled, prioritized, and rotated without code changes; secrets are encrypted and never returned in plaintext.

## Phase 3 — Durable Workflow Runtime

Goal: replace fragile synchronous rule execution with a versioned, observable runtime.

- [x] Add workflow/version/execution/step models.
- [x] Define graph schema and node registry.
- [ ] Migrate legacy rules to graph definitions.
- [ ] Add queue/worker infrastructure.
- [ ] Add idempotency, retries, timeouts, cancellation, and delays.
- [ ] Add variables, conditions, branching, webhooks, and schedules. Conditions and true/false branching are implemented; variables, webhooks, delays, and schedules remain.
- [ ] Add test mode. Published manual-run mode is implemented; safe draft test mode remains.
- [x] Add execution history and step inspector APIs.
- [ ] Add redaction for execution inputs/outputs.
- [ ] Add runtime integration tests. Tenant/runtime unit coverage is present; a real database/worker integration suite remains.

Exit criteria: workflows execute durably outside interactive requests and every run has accurate step-level history.

## Phase 4 — Premium Application Shell and Workflow Builder

Goal: deliver the modern SaaS experience without breaking existing product flows.

- [ ] Add semantic design tokens and icon system.
- [ ] Build product sidebar/top bar/organization switcher.
- [x] Build Root Admin shell.
- [ ] Migrate existing pages into the shell.
- [ ] Add React Query provider and query conventions.
- [ ] Build node palette, canvas, inspector, validation, autosave, undo/redo, test panel, and execution inspector. The core canvas, inspector, validation, autosave, undo/redo, published-run panel, and execution-history link are implemented; searchable palette, draft test mode, viewport polish, and accessibility work remain.
- [ ] Add polished responsive, loading, empty, unavailable, and error states.
- [ ] Perform light/dark/accessibility audit.
- [ ] Remove duplicate inline page patterns.

Exit criteria: all existing pages work in the new shell and the workflow builder supports complete create-test-publish-run flows.

## Phase 5 — Product Completeness

Goal: finish incomplete or missing customer workflows.

- [ ] Review and complete every ticket action.
- [ ] Add attachment architecture and secure storage.
- [ ] Improve mailbox setup, polling status, and diagnostics.
- [ ] Add customer-facing portal where product scope requires it.
- [ ] Add notification preferences and delivery channels.
- [ ] Add provider-aware AI usage/cost views.
- [ ] Add workflow templates and template installation.
- [ ] Add import/export with validation and secret exclusion.
- [x] Add organization member invitations and role management.
- [ ] Remove seeded/demo behavior from production paths.

Exit criteria: no dead buttons, fake actions, silent mock data, or incomplete critical flows remain.

## Phase 6 — Billing and Entitlements

Goal: make the platform commercially operable.

- [ ] Add plans, entitlements, subscriptions, usage meters, and billing customer records.
- [ ] Add Stripe checkout, portal, and webhook handling.
- [ ] Add idempotent webhook processing.
- [ ] Enforce feature and usage limits server-side.
- [ ] Add Root Admin billing configuration and plan management.
- [ ] Add customer billing and usage pages.
- [ ] Add billing tests and reconciliation tools.

Exit criteria: subscription and usage state controls real product access and can be audited/reconciled.

## Phase 7 — Hardening, Performance, and Launch Readiness

Goal: verify production behavior and operational readiness.

- [ ] Add rate limiting and abuse controls.
- [ ] Add CSRF/origin and security header hardening.
- [ ] Add structured logging, metrics, tracing, and error tracking.
- [ ] Add health/readiness endpoints and queue dashboards.
- [ ] Add database/query and bundle performance audits.
- [ ] Add Playwright critical-path suite.
- [ ] Add load and failure-mode testing.
- [ ] Add backup, restore, deployment, migration, rollback, and incident runbooks.
- [ ] Add privacy, retention, deletion, and legal product pages.
- [ ] Complete documentation and remove stale claims.

Exit criteria: launch checklist passes with no critical security, data-isolation, billing, workflow-runtime, or operability gaps.

## 17. Commit Strategy

Use focused commits similar to the existing history. Suggested early sequence:

1. `docs: add production readiness audit`
2. `docs: add SaaS implementation plan`
3. `test: add API authorization inventory`
4. `feat: add organization ownership models`
5. `feat: add Clerk product identity mapping`
6. `feat: add Root Admin session models`
7. `feat: add Root Admin authentication services`
8. `feat: add protected Root Admin shell`
9. `refactor: standardize protected API handlers`
10. `test: cover tenant and Root Admin authorization`

Do not combine schema foundations, UI redesign, workflow runtime, and provider management into one oversized commit.

## 18. Decision Log

### Accepted

- Preserve the existing support product foundation.
- Use Clerk for product users.
- Keep internal `Organization` and `OrganizationMember` records as the product tenancy source of truth; use Clerk for identity and invitation delivery rather than introducing Clerk Organizations as a second tenancy model.
- Keep Root Admin independent from Clerk.
- Use database-managed encrypted provider configuration after secure bootstrap.
- Build the visual workflow system on a durable versioned runtime.
- Keep architecture modular and incremental.

### Pending validation

- Whether to retain MongoDB long-term or migrate before billing/workflow scale increases.
- Queue technology and worker deployment model.
- Workflow canvas library. The current builder uses a lightweight internal canvas; reassess before adding zoom, mini-map, keyboard connection tooling, or very large graphs.
- KMS provider versus application-managed AES-GCM master key.
- Storage provider abstraction and default implementation.
- Initial pricing, plans, quotas, and usage metrics.

## 19. Definition of Done for Every Feature

A feature is complete only when:

- UI and backend behavior are connected;
- authentication, tenant authorization, and permissions are enforced;
- input is validated;
- secrets and sensitive data are protected;
- loading, empty, error, unavailable, and success states are present;
- logs/audit events are added where appropriate;
- tests cover critical behavior;
- documentation is updated;
- no fake success, placeholder action, or dead control remains;
- relevant checks pass;
- changes are committed in a focused increment.
