# Protected Product API Migration

Product APIs should use `createTenantApiRoute()` unless they intentionally belong to a different security boundary.

## Standard protected product boundary

`createTenantApiRoute()` owns:

- supported HTTP method routing and `Allow` responses;
- request correlation IDs;
- same-origin enforcement for browser mutations;
- product identity and active-organization resolution through `requireTenantApiPermission()`;
- route-specific permission checks;
- IP, identity, and organization rate limiting;
- optional Zod body/query parsing;
- normalized validation failures;
- explicit expected-domain error mapping;
- safe unexpected 500 responses.

Additional audit/security hooks should be added to this shared boundary instead of copied into each route when they are truly cross-cutting.

## Dedicated boundaries that should not use this wrapper

- Root Admin APIs use the independent Root Admin session boundary, with their own origin and rate-limit enforcement.
- Clerk lifecycle webhooks use Clerk signature verification.
- Inbound email webhooks use their raw-body HMAC boundary and mailbox-to-organization resolution.
- Public health/readiness endpoints remain intentionally separate.

## Migrated product APIs

### Versioned workflows

- `/api/workflow-definitions`
- `/api/workflow-definitions/[id]`
- `/api/workflow-definitions/[id]/publish`
- `/api/workflow-definitions/[id]/run`
- `/api/workflow-definitions/[id]/test`
- `/api/workflow-definitions/[id]/versions`
- `/api/workflow-definitions/options`

### Core ticket and AI operations

- ticket collection reads
- ticket status, priority, assignment, and tag mutations
- bulk ticket status, priority, and assignment changes
- internal notes
- manual replies
- AI draft generation
- AI draft persistence
- AI draft send

Legacy null-owned tickets used by draft-save and internal-note flows are accessible only through the deterministic legacy workspace.

### Reporting and email administration

- analytics
- email delivery logs
- email template collection/detail
- tenant inbox polling
- notifications
- CSAT ticket rating and CSAT aggregate statistics
- tag collection reads and creation
- mailbox configuration collection/detail reads
- mailbox creation, update, and deletion with masked API responses and encrypted stored secrets

### Team administration

- user/member collection reads
- user/member detail reads
- role updates
- organization-member removal
- legacy direct password-based creation remains development-gated; production team onboarding uses organization invitations

### SLA administration and status

- SLA policy collection reads
- SLA policy timing updates
- per-ticket SLA status reads

### Customers and saved replies

- customer collection and detail reads
- saved-reply collection reads and creation
- saved-reply update and deletion
- legacy null-owned customers, customer tickets, and saved replies are visible only through the deterministic legacy workspace

## Remaining migration work

Continue by domain rather than performing a blind repository rewrite:

1. remaining legacy workflow-rule endpoints;
2. final source inventory proving every protected product route either uses `createTenantApiRoute()` or has a documented dedicated boundary.

Do not convert a route until its current service contract, HTTP verbs, and domain-specific error behavior have been reviewed. Preserving working client behavior is more important than mechanically replacing middleware calls.
