# Architecture

## System overview

The application uses a layered feature architecture within one Next.js deployment.

```text
Browser and server-rendered pages
        ↓
App Router pages and components
        ↓
Typed API client
        ↓
Pages Router API handlers
        ↓
Authentication, tenant context, permissions, and validation
        ↓
Feature services
        ↓
Prisma and external providers
        ↓
MongoDB, Clerk, AI providers, SMTP, and IMAP
```

The Root Admin control plane shares the deployment but keeps authentication, authorization, routes, and responsibilities separate from the product-user application.

## Directory structure

```text
app/                  product and Root Admin pages
pages/api/            product and Root Admin API handlers
features/             feature-owned components, services, types, and tests
components/           shared UI and layout components
lib/                  shared infrastructure, auth, security, and configuration
prisma/               MongoDB schema and seed data
docs/                 architecture, operations, security, and roadmap
scripts/              bootstrap, validation, migration, and audit utilities
```

Feature folders generally use:

```text
features/<feature>/
  components/         user interface
  services/           business logic and data access
  types/              feature contracts
  utils/              pure helpers where required
  *.test.ts            colocated focused tests
```

Components do not import Prisma. Services do not render UI. Database and provider details stay behind server-side boundaries.

## API pattern

A protected API route follows this order:

1. validate the HTTP method;
2. establish product or Root Admin authentication;
3. resolve tenant context where applicable;
4. enforce the required permission;
5. validate request data with Zod;
6. call a feature service;
7. return a consistent JSON response;
8. write audit or operational records when required.

Authentication, tenant scope, and permission enforcement must happen before feature services read or mutate data.

## Authentication boundaries

### Product users

Clerk is the primary product identity provider.

The local database owns:

- application users;
- organization and tenant membership;
- roles and permissions;
- application profile data;
- feature access and authorization state.

Clerk proves identity. It does not replace application authorization or tenant ownership.

### Root Admin

Root Admin uses an independent authentication and session system.

Root Admin controls:

- provider configuration;
- runtime settings;
- platform audit logs;
- system health;
- organization administration;
- bootstrap and operational controls.

Root Admin sessions do not reuse Clerk product sessions or product-user roles.

### Legacy development authentication

Seeded legacy accounts are available only when `auth.allow_legacy_product_auth` is enabled through Root Admin outside production.

Legacy authentication must remain disabled in production.

See [authentication.md](authentication.md) for the complete contract.

## Tenant isolation and authorization

Tenant-owned data is resolved from authenticated application context rather than from public request headers or caller-supplied identifiers alone.

The platform uses role and permission checks at API and server-side page boundaries. UI visibility improves usability but is not considered authorization.

Tenant-sensitive service operations must receive or derive authoritative tenant context and must not use unscoped Prisma access.

## Runtime configuration

The database and Root Admin interface are authoritative for administrator-managed runtime settings.

Environment variables are limited to bootstrap values required before the application can safely read the database, including:

- `DATABASE_URL`;
- Clerk bootstrap keys;
- Root Admin session secret;
- configuration encryption key;
- explicitly documented migration-only values.

AI keys, models, provider order, feature toggles, mailbox configuration, webhook signing secrets, and other administrator-managed settings belong in encrypted database-backed configuration.

## AI provider architecture

AI draft generation uses a configurable provider chain.

```text
Draft request
    ↓
Provider registry and enabled priority
    ↓
Provider adapter
    ↓
Success or controlled fallback
    ↓
Usage and failure log
```

Provider adapters normalize requests and results across supported providers. Each attempt records provider, model, latency, usage, status, and safe error details.

Mock behavior is development-only and controlled by the database-managed `ai.allow_mock_provider` setting.

## Multi-mailbox email architecture

Each tenant-owned mailbox has its own SMTP and IMAP configuration.

```text
Email configuration
  ├── outbound SMTP delivery
  ├── inbound IMAP polling
  ├── originating mailbox identity
  ├── encrypted credentials
  └── delivery and ingestion logs
```

Inbound processing:

1. poll active mailboxes in parallel;
2. parse messages;
3. resolve the mailbox and tenant;
4. find or create the customer;
5. match email threading metadata;
6. create or update a ticket;
7. run classification and eligible workflows;
8. write email and ticket activity records.

One mailbox failure must not prevent other mailbox polls. Credentials are encrypted at rest and never returned through normal administrator reads.

## Workflow engine

Workflows use structured, versioned definitions rather than arbitrary application code.

A workflow contains:

- a trigger;
- conditions;
- ordered actions;
- publication state;
- a versioned definition.

Execution creates durable workflow and step records. Idempotency prevents duplicate event processing, while execution inspection supports operational debugging and recovery.

Actions must use normal service, tenant, permission, and audit boundaries rather than bypassing them.

## Ticket and customer domain

Tickets own conversation, status, priority, assignment, mailbox, tags, activity, SLA, and customer context.

Ticket services coordinate business rules. Email ingestion, manual agent actions, workflows, and AI assistance all call the same domain boundaries instead of maintaining separate ticket logic.

## Real-time updates

Server-sent events provide lightweight ticket update notifications with a heartbeat. Clients use the event as a refresh signal rather than treating the stream as the authoritative data source.

Database records remain authoritative for tickets, activities, and notifications.

## Security boundaries

- Product and Root Admin authentication are separate.
- Tenant context is required for tenant-owned records.
- Provider and mailbox secrets are encrypted.
- Inbound webhook payloads require signing verification.
- Server-only credentials never reach browser bundles.
- Administrator-managed settings remain database-backed.
- Production validation rejects unsafe bootstrap configuration.
- Audit logs record sensitive administrative actions without storing raw secrets.

## Testing and validation

The repository uses:

- Vitest for focused unit and service behavior;
- Prisma schema validation;
- TypeScript validation;
- ESLint and Prettier checks;
- API-boundary auditing;
- production environment validation;
- production builds;
- Docker-based local deployment support.

Integration and end-to-end coverage should focus on tenant isolation, authentication boundaries, mailbox ingestion, workflow idempotency, and administrator configuration.

## Extension rules

When adding a feature:

1. keep feature ownership under `features/`;
2. reuse shared infrastructure only when behavior is genuinely shared;
3. keep provider-specific details behind adapters;
4. preserve tenant and permission enforcement;
5. store administrator-managed runtime settings in the database;
6. add focused tests and update affected documentation;
7. avoid adding abstractions that only one feature needs.
