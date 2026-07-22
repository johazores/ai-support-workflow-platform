# Production Readiness Audit

Date: July 20, 2026

## Purpose

This document records the current state of the repository before the SaaS transformation begins. It is intentionally based on the existing architecture and commit history. The goal is to preserve the working helpdesk foundation, identify production blockers, and define where additions or targeted refactors are justified.

## Executive Summary

The repository is a solid early-stage helpdesk product with a notably incremental commit history, a consistent feature-module layout, reusable UI components, a service layer, Prisma-backed persistence, API validation, basic RBAC, email ingestion, AI draft generation, and a small workflow engine.

It is not yet a production-ready multi-tenant SaaS platform.

The main blockers are architectural rather than visual:

1. Product authentication is custom JWT/password authentication instead of Clerk.
2. The existing `admin` role is a product role, not an independent Root Admin control plane.
3. All data is global; there is no organization or tenant boundary.
4. Provider and mailbox secrets are stored as plaintext fields.
5. Configuration is environment-variable driven and cannot be managed centrally.
6. The workflow implementation is a rule form and synchronous rule executor, not a versioned workflow platform.
7. Several security controls documented as complete are missing or inconsistently applied.
8. Mock/canned AI output can silently make failed integrations look successful.
9. Tests cover selected units but not critical end-to-end product flows.
10. Documentation has drifted from the actual schema and implementation.

The correct approach is an incremental migration. The ticketing, email, UI primitives, feature modules, service conventions, and existing API client should be reused. Authentication, tenancy, credentials, workflow execution, and the application shell need deliberate evolution.

## Repository and History Review

### What the history shows

The project was built through many small, focused commits covering:

- base structure and architecture notes;
- ticket models, services, API routes, and UI;
- AI draft generation and provider abstraction;
- workflow rule creation and execution;
- local authentication and RBAC;
- reusable UI primitives and API client extraction;
- email ingestion, SMTP, IMAP, mailbox management, and templates;
- notifications, tags, saved replies, SLA, CSAT, analytics, and audit views;
- tests, CI, formatting, Docker, and documentation;
- targeted bug fixes and refactors.

This history should be preserved. Future work should continue using focused commits rather than replacing the repository with a generated application.

### Existing architectural strengths

- Next.js App Router for pages with Pages Router API handlers.
- Strict TypeScript configuration.
- Prisma as the data-access boundary.
- Feature-oriented folders with components, services, types, and utilities.
- Shared API client instead of scattered raw `fetch` calls.
- Zod used in many request handlers.
- Shared UI primitives.
- Server-side page guards and API permission helpers.
- Existing ticket, email, AI, notification, analytics, and support-domain behavior worth retaining.
- CI jobs for formatting, linting, type checking, tests, and builds.
- Cursor-based ticket pagination and useful database indexes.

## Current Technology Reality

The current dependency set includes Next.js, React, TypeScript, Prisma/MongoDB, Zod, `jose`, bcrypt, OpenAI, Nodemailer, IMAP, and Vitest.

The following requested platform dependencies or equivalents are not present yet:

- Clerk;
- React Query;
- Stripe;
- Redis or another queue/cache backend;
- a node-canvas/workflow graph library;
- end-to-end browser testing;
- structured observability tooling;
- a job worker runtime;
- dedicated secret-management integration.

These should be introduced only when their feature phase starts.

## Architecture Findings

### 1. Authentication and identity

#### Current state

- `User` stores `email`, `passwordHash`, and a string `role`.
- Login validates a local password and issues a 24-hour HS256 JWT.
- The JWT is stored in an HttpOnly cookie.
- Sessions are stateless and cannot be revoked centrally.
- Product pages and API routes rely on the same local session.

#### Gap

The requested hybrid model requires two independent identity systems:

- Clerk for product users;
- local JWT authentication for Root Admin users.

The existing local system cannot simply be renamed Root Admin because its `User` records represent support agents and its permissions are used across the product.

#### Direction

- Preserve `User` as the internal product profile, but replace `passwordHash` with a Clerk identity link such as `clerkUserId`.
- Add `Organization`, `OrganizationMember`, `Role`, and permission-scoping fields.
- Add separate `RootAdmin`, `RootSession`, and Root Admin audit models.
- Use a different cookie name, route namespace, signing key, audience, and authorization middleware for Root Admin.
- Support server-side Root Admin session revocation and rotation.
- Keep a controlled migration path for seeded/local development accounts.

### 2. Tenant isolation

#### Current state

All records are global. Users, customers, tickets, workflows, tags, templates, email configurations, notifications, and settings have no organization identifier.

Several fields are globally unique, including customer email, tag name, SLA priority, and mailbox address.

#### Risk

A SaaS launch on the current schema would allow cross-customer data collisions and creates a high risk of accidental cross-tenant access.

#### Direction

- Add `organizationId` to all tenant-owned records.
- Make unique constraints tenant-aware where appropriate.
- Require tenant context in repositories/services, not only UI filters.
- Add authorization helpers that resolve both identity and organization membership.
- Add tests proving one organization cannot access another organization's data.

### 3. Root Admin control plane

#### Current state

The existing `/admin` area is a product administration dashboard for supervisors/admins. It manages workflows, users, SLA policies, email settings, customers, logs, and analytics.

#### Gap

There is no independent platform-owner area, local Root Admin account, environment manager, provider manager, global feature flags, billing controls, platform audit trail, or system health dashboard.

#### Direction

Create a separate `/root` route group and API/control-plane boundary. It should not reuse product-user Clerk sessions. Product administration remains tenant-scoped under the main application.

### 4. Environment and configuration management

#### Current state

Database access, JWT signing, webhook verification, and AI providers are read directly from environment variables. AI provider selection is rebuilt from `process.env` per request.

#### Important deployment constraint

Not every secret can safely be moved into the database. At minimum, the deployment still needs bootstrap secrets such as:

- the database connection used to load dynamic configuration;
- an encryption master key or external KMS identity;
- the Root Admin signing/bootstrap secret;
- platform hosting/runtime variables that must exist before application startup.

The UI can manage almost all integration and product configuration after bootstrap, but claiming that zero deployment secrets are ever needed would be unsafe and technically inaccurate.

#### Direction

- Introduce typed system settings and provider records.
- Store encrypted secret payloads using authenticated encryption.
- Keep one deployment-level encryption/KMS bootstrap secret.
- Mask values in all API responses and logs.
- Add versioning, rotation, validation, test-connection, enable/disable, and failure tracking.
- Cache resolved configuration with explicit invalidation.
- Never expose database credentials to product-level administrators.

### 5. Secret storage

#### Current state

`EmailConfig` stores SMTP and IMAP passwords as plaintext strings. Service methods return complete database records. Provider credentials remain environment variables.

#### Risk

Plaintext credentials can leak through database access, logs, API serialization, backups, or accidental UI responses.

#### Direction

- Replace plaintext secret fields with encrypted credential references.
- Separate public configuration metadata from secret payloads.
- Use AES-256-GCM or an external KMS-backed envelope encryption design.
- Store nonce, authentication tag, key version, and ciphertext.
- Never return decrypted values after initial entry; use masked placeholders.
- Audit every reveal, rotation, test, and deletion operation.

### 6. API authorization consistency

#### Current state

The repository contains API authentication and permission helpers, but enforcement is not universal. For example, the workflow creation route validates input but does not authenticate or authorize the request.

#### Risk

A single omitted middleware call creates an unauthenticated write endpoint.

#### Direction

- Create a standard route wrapper that enforces method, identity, tenant, permission, Zod validation, and normalized error responses.
- Add an automated route-security test/inventory.
- Default protected APIs to deny access unless explicitly public.
- Keep public webhook endpoints isolated with signature verification and rate limits.

### 7. Workflow data model

#### Current state

- `WorkflowRule.trigger` is a JSON string.
- `WorkflowRule.actions` is unversioned JSON.
- The form supports one trigger and one action.
- Execution scans all active rules synchronously.
- The engine uses ticket activity-log message text to infer whether a rule already ran.
- Assign-ticket writes a hard-coded email address.
- Executed action labels accumulate across rule iterations.
- There is no execution, step, retry, queue, schedule, webhook, delay, variable, branch, or version model.

#### Direction

Preserve the existing rule engine as a migration source, but evolve to:

- `Workflow` for ownership and status;
- immutable `WorkflowVersion` definitions;
- a validated graph definition with nodes and edges;
- `WorkflowExecution` and `WorkflowExecutionStep` records;
- idempotency keys;
- explicit execution states;
- persisted input/output/error payloads with secret redaction;
- retries, timeouts, cancellation, delays, and resumable jobs;
- a node registry for triggers, actions, conditions, AI operations, webhooks, and transformations;
- test mode and published/draft versions.

### 8. Workflow user experience

#### Current state

The workflow screen is a traditional form with selects and text inputs. It is useful for simple rules but does not meet the requested Zapier-style experience.

#### Direction

- Introduce the new graph builder behind a feature flag.
- Reuse existing Card, Button, Input, Select, Alert, toast, and async-action patterns.
- Add a node palette, searchable action catalog, canvas, connection validation, inspector panel, run/test panel, keyboard controls, zoom, undo/redo, autosave, and clear validation errors.
- Migrate simple existing rules to equivalent graph definitions.

### 9. AI provider behavior

#### Current state

- OpenAI and Anthropic are selected through environment variables.
- A mock provider is always appended.
- A final catch returns a canned support response.

#### Risk

A broken production provider can appear to work because the user receives mock or canned content. This hides outages, invalid keys, billing problems, and model errors.

#### Direction

- Allow mock providers only in explicit development/test mode.
- Persist provider configuration and priority.
- Add enabled/disabled state, health checks, quotas, request limits, cost metadata, failure counts, and circuit-breaker behavior.
- Surface failures honestly in the UI.
- Track provider attempt, model, latency, token usage, estimated cost, organization, user, workflow, and execution.

### 10. Documentation drift

Examples of drift include:

- architecture documentation says usage logs contain token counts and latency, while the schema contains only provider, model, success, error, and timestamp;
- the roadmap marks production readiness complete while also listing rate limiting, encrypted credentials, session revocation, and end-to-end tests as future work;
- the README presents seeded demo credentials and mock fallback as part of normal setup;
- the documented permission names and current implementation need a single generated source of truth.

Documentation must be updated alongside each implementation phase.

## Database Review

### Existing useful models

The following models represent valuable product behavior and should be migrated, not discarded:

- User
- Customer
- Ticket
- Message
- Draft
- WorkflowRule
- ActivityLog
- AiUsageLog
- EmailConfig
- EmailLog
- EmailTemplate
- Notification
- Tag
- SavedReply
- SlaPolicy
- CsatRating

### Structural issues

- No organization ownership.
- Product user password authentication is embedded in `User`.
- Roles and statuses are free-form strings.
- Several ObjectId fields are not modeled as Prisma relations.
- `Ticket.mailboxId` has no relation.
- `Notification.userId` has no user relation.
- `CsatRating.ticketId` has no ticket relation.
- `EmailLog.messageId` and `ticketId` are identifiers without modeled relations.
- Workflow trigger is a string containing JSON.
- No workflow execution history.
- No provider, credential, integration, billing, subscription, API key, environment, feature flag, or generalized audit models.
- No soft-delete/retention strategy.
- No schema-level tenant indexes.

### MongoDB decision

MongoDB can continue to support the product, particularly for workflow definitions and event payloads. A database migration should not be performed only for fashion. However, relational requirements for billing, memberships, permissions, and reporting must be evaluated before expanding the schema. If MongoDB is retained, tenant-scoped unique indexes and transaction boundaries must be designed carefully.

## UI and UX Review

### Existing strengths

- Responsive header and mobile menu.
- Dark mode support.
- Reusable inputs, buttons, cards, alerts, dialogs, skeletons, and toasts.
- Existing loading, empty, and error patterns.
- Support-domain pages are already connected to backend services.

### Gaps

- The shell is a header plus page grids rather than a cohesive SaaS workspace.
- No persistent sidebar, organization switcher, breadcrumbs, active navigation, command/search interface, or contextual settings hierarchy.
- Admin navigation is a long grid of nearly identical cards.
- Several visual icons are large inline SVG blocks rather than a consistent icon system.
- The workflow form supports only a narrow rule use case.
- Client data state is manually managed; React Query is not present.
- There is no Root Admin design language distinct from tenant administration.
- No first-run onboarding, provider setup wizard, workflow test experience, billing flow, or integration health experience.

### Direction

Build a shared application shell and design tokens first, then migrate pages gradually. Avoid a wholesale visual rewrite that disconnects existing functionality.

## Performance Review

### Existing positive work

- Ticket pagination exists.
- Some query indexes exist.
- Server components are used for pages.
- Feature boundaries reduce accidental client bundling.

### Gaps

- AI, email polling, and workflow execution can run in request/response paths.
- No durable background queue.
- No centralized cache or invalidation strategy.
- No execution-history pagination model.
- No provider-level concurrency or rate-limit control.
- No explicit slow-query monitoring.
- No bundle analysis or performance budgets.
- Tenant scoping will require compound indexes.

## Testing and Quality Review

### Existing coverage

- Vitest unit tests for selected utilities, provider chains, API auth helpers, and workflow matching.
- CI performs formatting, linting, type checking, tests, and build.

### Gaps

- No Playwright end-to-end suite.
- No real database integration tests.
- No tenant-isolation tests.
- No Clerk webhook/session tests.
- No Root Admin auth/revocation tests.
- No encryption round-trip/rotation tests.
- No workflow execution persistence/retry tests.
- No SMTP/IMAP provider contract tests.
- No API route inventory proving authorization coverage.
- Build CI uses a placeholder database URL and does not validate production runtime behavior.

## Operations and Observability Review

Missing or incomplete capabilities include:

- structured application logging;
- correlation/request IDs;
- error tracking;
- metrics and tracing;
- health/readiness endpoints;
- queue health and dead-letter handling;
- secret rotation monitoring;
- provider uptime and failure dashboards;
- data retention and deletion workflows;
- backup/restore documentation;
- deployment migration strategy;
- incident and rollback procedures.

## Features to Preserve

The SaaS transformation should keep and evolve:

- inbox and ticket detail;
- replies, drafts, internal notes, tags, assignments, status, priority, SLA, and CSAT;
- customer directory;
- email delivery and ingestion concepts;
- notification concepts;
- AI draft provider abstraction;
- rule migration path;
- analytics and audit views;
- feature-folder conventions;
- shared UI primitives;
- API client and Zod validation patterns;
- focused commit history.

## Immediate Production Blockers

These must be addressed before claiming production readiness:

- [ ] Establish organization/tenant ownership and authorization.
- [ ] Introduce Clerk product authentication.
- [ ] Introduce independent Root Admin authentication and sessions.
- [ ] Remove plaintext integration secrets.
- [ ] Remove mock/canned AI fallback from production behavior.
- [ ] Apply authorization consistently to every protected endpoint.
- [ ] Add API rate limiting and abuse controls.
- [ ] Add CSRF/origin protections appropriate to each mutation surface.
- [ ] Add durable workflow execution records and idempotency.
- [ ] Move long-running work to a queue/worker.
- [ ] Add end-to-end and tenant-isolation tests.
- [ ] Add observability, health checks, and operational documentation.
- [ ] Reconcile documentation with actual behavior.

## Recommended First Implementation Slice

The first code implementation should be the identity and control-plane foundation, not the visual workflow canvas.

1. Add organization-aware schema foundations.
2. Add Clerk packages and product-user identity mapping.
3. Add separate Root Admin and Root Session models.
4. Add separate Root Admin JWT/cookie helpers with revocation.
5. Add `/root/login` and a minimal protected `/root` shell.
6. Add route wrappers for product and Root Admin authorization.
7. Add security tests for both auth systems and tenant boundaries.
8. Keep the existing local login available only behind an explicit development migration flag until seed/demo flows are replaced.

Once this foundation is stable, encrypted configuration/provider management can be implemented safely.
