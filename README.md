# AI Support Workflow Platform

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.0-informational.svg)](package.json)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

A multi-tenant AI customer support platform with shared inboxes, ticket workflows, provider failover, email integration, and secure root administration.

The project demonstrates production-focused patterns while keeping the architecture readable: feature-owned services, type-safe APIs, separate authentication boundaries, encrypted database configuration, dynamic provider resolution, and durable workflow execution.

> **Status:** Active development. The repository includes production-oriented foundations, but deployments still require environment validation, secure provider configuration, and operational review.

## Features

### Inbox and tickets

- Searchable ticket list and complete conversation threads
- Status, priority, assignment, tags, internal notes, and activity history
- Customer ticket history and email-thread metadata
- Bulk ticket operations and CSAT collection
- SLA policies, saved replies, analytics, notifications, and audit logs

### AI-assisted replies

- Tone-aware reply generation
- Database-managed provider fallback chain
- Root Admin control of provider state, priority, credentials, models, and base URLs
- Automatic failover between enabled providers
- Usage, latency, failure, and provider-attempt logging
- Controlled mock provider outside production only

### Workflow automation

- Structured triggers and actions
- Versioned workflow definitions
- Durable workflow execution and step records
- Manual and event-driven execution
- Idempotency and execution inspection

### Email integration

- Multiple tenant-owned SMTP and IMAP mailboxes
- Parallel inbox polling and inbound ticket ingestion
- Threaded outbound delivery through the originating mailbox
- Encrypted mailbox credentials
- Database-managed inbound webhook signing secret
- Email templates and delivery logs

### Administration

- Product-user roles and permissions
- Organization management and tenant boundaries
- Clerk product authentication
- Independent Root Admin control plane
- Database-backed runtime settings
- Provider management and connection tests
- Platform audit logs and system health

## Authentication model

The platform keeps three authentication concerns separate:

- **Product users:** Clerk is the primary identity provider. The local database owns tenant membership, roles, permissions, and application data.
- **Root Admin:** Independent authentication and sessions protect platform-wide configuration and operations.
- **Legacy development accounts:** Available only outside production when `auth.allow_legacy_product_auth` is explicitly enabled through Root Admin.

Read [authentication architecture](docs/authentication.md) for the complete contract.

## Runtime configuration

The Root Admin interface and database are authoritative for administrator-managed runtime configuration.

Environment variables are limited to bootstrap values required before the application can safely read the database:

```env
DATABASE_URL="mongodb+srv://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
CLERK_WEBHOOK_SIGNING_SECRET=""
ROOT_SESSION_SECRET="generate-a-random-string-at-least-32-chars"
CONFIG_ENCRYPTION_KEY="base64-encoded-32-byte-key"
```

Do not manage AI keys, models, provider order, mailbox credentials, webhook signing secrets, feature toggles, or administrator-managed URLs through deployment variables. Configure them through Root Admin.

See [runtime configuration](docs/runtime-configuration.md).

## Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16, App Router and Pages API routes |
| Language | TypeScript 5, strict mode |
| Database | MongoDB and Prisma 6 |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 |
| Authentication | Clerk product auth and independent Root Admin sessions |
| AI | OpenAI-compatible providers, Anthropic, and Gemini |
| Email | Nodemailer, IMAP, and mailparser |
| Testing | Vitest 4 |
| Containers | Docker and Docker Compose |

## Project structure

```text
app/                  application and Root Admin pages
pages/api/            product and Root Admin API handlers
features/             feature-owned components, services, types, and tests
components/           shared UI and layout components
lib/                  infrastructure, security, authentication, and configuration
prisma/               MongoDB schema and seed data
docs/                 architecture, operations, security, and roadmap
scripts/              bootstrap, validation, migration, and audit utilities
```

Read the [architecture guide](docs/architecture.md) for request flow, authentication, tenant isolation, AI providers, email, and workflow execution.

## Requirements

- Node.js 22 recommended
- MongoDB local instance or MongoDB Atlas
- Clerk application for primary product authentication

## Installation

```bash
git clone https://github.com/johazores/ai-support-workflow-platform.git
cd ai-support-workflow-platform
npm install
cp .env.example .env
```

Initialize the database:

```bash
npm run db:setup
```

Provision the independent Root Admin account:

```bash
npm run root:bootstrap
```

Start development:

```bash
npm run dev
```

After signing in as Root Admin:

1. configure AI integrations under **Providers**;
2. configure application values under **Runtime Settings**;
3. configure tenant mailboxes;
4. test enabled provider connections;
5. disable temporary development authentication;
6. remove temporary bootstrap credentials when operationally possible.

Demo account details, when needed, should remain in internal or dedicated demo documentation rather than the public project overview.

## Validation

```bash
npm run prisma:validate
npm run audit:api-boundaries
npm run type-check
npm run lint
npm run format:check
npm test
npm run build
```

Validate the minimal production bootstrap environment with:

```bash
NODE_ENV=production node scripts/validate-production-environment.mjs
```

## Documentation

- [Documentation index](docs/index.md)
- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Runtime configuration](docs/runtime-configuration.md)
- [Email integration](docs/email-integration.md)
- [Production operations](docs/production-operations-runbook.md)
- [Production environment validation](docs/production-environment-validation.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](docs/changelog.md)
- [Contributing](docs/contributing.md)
- [Security policy](docs/security.md)
- [Code of conduct](docs/code-of-conduct.md)
- [Implementation plan](MASTER_IMPLEMENTATION_PLAN.md)

## License

MIT. See [LICENSE](LICENSE).

## Author

Created and maintained by [Johanssen Azores](https://github.com/johazores).
