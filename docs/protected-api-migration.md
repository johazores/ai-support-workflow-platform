# Protected Product API Migration

Product APIs use one of two standardized browser boundaries depending on whether an active tenant already exists.

## Tenant product boundary

`createTenantApiRoute()` is the default for product APIs after an active organization can be resolved. It owns:

- supported HTTP method routing and `Allow` responses;
- request correlation IDs;
- same-origin enforcement for browser mutations;
- Clerk product identity and active-organization resolution;
- active `OrganizationMember` role/permission checks;
- IP, identity, and organization rate limiting;
- optional Zod body/query parsing;
- normalized validation failures;
- explicit expected-domain error mapping;
- safe unexpected 500 responses.

## Pre-tenant product identity boundary

`createProductIdentityApiRoute()` is used only when the operation must happen before an active organization exists or while choosing it. It provides the same request/origin/rate-limit/validation/error guarantees but authenticates the product identity without inventing a tenant.

Current pre-tenant routes are:

- organization membership listing;
- active organization selection;
- first-organization Clerk onboarding.

`requireApiAuth()` is Clerk-exclusive whenever Clerk is configured. It never falls back to `support_session` after a failed Clerk lookup. Historical local product sessions are available only when Clerk is absent and the explicit non-production legacy-auth gate is enabled.

## Dedicated boundaries

These routes intentionally do not use the product wrappers:

- Root Admin APIs use the independent Root Admin session boundary, with Root-specific origin and rate-limit enforcement;
- `/api/auth/*` owns product login/logout/session migration behavior;
- Clerk lifecycle webhooks use Clerk signature verification;
- inbound email webhooks use raw-body HMAC verification and mailbox-to-organization resolution;
- public health/readiness endpoints remain intentionally unauthenticated.

## Standardized product domains

The standardized tenant boundary now covers:

- versioned workflow definition, publishing, run, test, history, and editor-option APIs;
- legacy workflow-rule compatibility create/status/delete/manual-run APIs;
- ticket collection reads, status, priority, assignment, tags, bulk changes, SLA, internal notes, replies, and ticket event streams;
- AI draft generation, persistence, and send;
- analytics and CSAT;
- customers and saved replies;
- notifications;
- email delivery logs, templates, mailbox polling, and mailbox configuration;
- tag administration;
- team/member administration;
- organization invitation list/create/revoke;
- SLA policy administration.

The legacy `/api/workflows/create` URL remains only as a compatibility alias to the canonical `/api/workflows` handler rather than a duplicate implementation.

## Tenant-isolation corrections discovered during migration

The migration review also fixed service-layer compatibility paths so normal organizations cannot see or adopt `organizationId:null` records for:

- customers and their ticket history;
- saved replies;
- AI draft ticket lookup;
- internal note ticket lookup.

Only the deterministic legacy workspace retains controlled null-owned migration access.

The ticket Server-Sent Events endpoint was also found to be unauthenticated. It now requires `tickets:read`, verifies tenant ticket ownership before opening the stream, and uses a feature-level ticket event bus rather than exposing the connection registry as business logic.

## Enforcement

Two repository checks make the migration deny-by-default:

- `lib/api-security-boundary-inventory.test.ts` walks every Pages API route and requires a standardized wrapper or explicit dedicated/public classification;
- `scripts/audit-product-api-boundaries.mjs` exits non-zero for direct product-auth helpers or unclassified product routes.

The standalone audit runs inside the existing single GitHub Actions Quality Gate. New product APIs should fail CI if they bypass the standardized boundaries.
