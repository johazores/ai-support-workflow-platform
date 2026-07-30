# AI Support Workflow Platform

A full-stack customer support platform with AI-assisted replies, multi-mailbox email, workflow automation, tenant isolation, and role-based access control.

The project demonstrates production-focused patterns while keeping the architecture readable: layered services, type-safe APIs, independent Root Admin authentication, encrypted database configuration, dynamic provider resolution, and durable workflow execution records.

## Core Features

### Inbox and tickets

- Searchable ticket list and complete conversation threads
- Status, priority, assignment, tags, internal notes, and activity history
- Customer ticket history and email-thread metadata
- Bulk ticket operations and CSAT collection

### AI draft replies

- Tone-aware reply generation
- Database-managed AI provider fallback chain
- Root Admin control of provider state, priority, credentials, models, and base URLs
- Automatic failover between enabled providers
- Usage and failure logging
- Optional mock provider outside production only

### Workflow automation

- Structured triggers and actions
- Versioned visual workflow definitions
- Published workflow execution with durable execution and step records
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
- Independent Root Admin control plane
- Database-backed runtime settings
- Provider management and connection tests
- Platform audit logs and system health

## Runtime Configuration

The Root Admin CMS and the database are the source of truth for administrator-managed runtime configuration.

Environment variables are limited to minimal bootstrap values required before the application can safely read the database:

```env
DATABASE_URL="mongodb+srv://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
CLERK_WEBHOOK_SIGNING_SECRET=""
ROOT_SESSION_SECRET="generate-a-random-string-at-least-32-chars"
CONFIG_ENCRYPTION_KEY="base64-encoded-32-byte-key"
```

Optional migration and one-time bootstrap values are documented in `.env.example`.

Do not configure AI keys, AI models, webhook signing secrets, feature toggles, provider URLs, or other administrator-managed settings in the deployment environment. Configure them through Root Admin instead.

Important Root Admin system settings:

| Key | Type | Purpose |
| --- | --- | --- |
| `email.inbound_webhook_secret` | Encrypted secret | Signs inbound email webhook payloads |
| `ai.allow_mock_provider` | Boolean | Enables mock AI outside production |
| `auth.allow_legacy_product_auth` | Boolean | Enables temporary legacy login outside production |

See [docs/runtime-configuration.md](docs/runtime-configuration.md) for the full ownership, security, and migration contract.

## Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16, App Router and Pages API routes |
| Language | TypeScript 5, strict mode |
| Database | MongoDB and Prisma 6 |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 |
| Authentication | Clerk, signed JWT sessions, independent Root Admin sessions |
| AI | OpenAI-compatible providers, Anthropic, and Gemini |
| Email | Nodemailer, IMAP, and mailparser |
| Testing | Vitest 4 |
| CI | GitHub Actions |
| Containers | Docker and Docker Compose |

## Project Structure

```text
app/                  Application pages and App Router handlers
pages/api/            Product and Root Admin API routes
features/             Feature-owned components, services, types, and tests
components/           Shared UI and layout components
lib/                  Shared infrastructure and security helpers
prisma/               MongoDB schema and seed data
docs/                 Architecture, operations, security, and product plans
scripts/              Bootstrap, validation, and audit utilities
.github/workflows/    Cost-conscious CI pipeline
```

Feature folders generally use:

- `components/` for UI
- `services/` for business logic and data access
- `types/` for feature-specific contracts
- colocated tests for critical behavior

## Getting Started

### Requirements

- Node.js 22 recommended
- MongoDB local instance or MongoDB Atlas
- Clerk application for the primary product authentication flow

### Install

```bash
git clone https://github.com/johazores/ai-support-workflow-platform.git
cd ai-support-workflow-platform
npm install
cp .env.example .env
```

Configure the bootstrap values in `.env`, then initialize the database:

```bash
npm run db:setup
```

Provision the independent Root Admin account:

```bash
npm run root:bootstrap
```

Start the application:

```bash
npm run dev
```

After signing in as Root Admin:

1. configure AI integrations under **Providers**;
2. configure application runtime values under **Runtime Settings**;
3. test enabled provider connections;
4. remove temporary bootstrap credentials from the runtime environment when operationally possible.

Seeded legacy demo accounts remain available only when `auth.allow_legacy_product_auth` is enabled in Root Admin outside production.

| Account | Email | Password | Role |
| --- | --- | --- | --- |
| Admin | `alex@company.com` | `admin123` | admin |
| Supervisor | `sam@company.com` | `super123` | supervisor |
| Agent | `jordan@company.com` | `support123` | agent |

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

- [Runtime configuration](docs/runtime-configuration.md)
- [Architecture](docs/architecture.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Email integration](docs/email-integration.md)
- [Production operations](docs/production-operations-runbook.md)
- [Production environment validation](docs/production-environment-validation.md)
- [Implementation plan](MASTER_IMPLEMENTATION_PLAN.md)

## Author

Johanssen Azores
