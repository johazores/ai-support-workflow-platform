# Architecture

## Overview

The application is a full-stack helpdesk built with Next.js 16. It uses the **App Router** for server-rendered pages and the **Pages Router** exclusively for API routes. All business logic lives in a feature-based `features/` directory, keeping pages and API handlers thin.

## System Layers

```
┌─────────────────────────────────────────┐
│  Browser (React 19, Tailwind CSS 4)     │
│  └─ Client services (apiClient)         │
├─────────────────────────────────────────┤
│  API Routes (pages/api/)                │
│  └─ Zod validation → service call       │
├─────────────────────────────────────────┤
│  Feature Services (features/*/services) │
│  └─ Business logic, Prisma queries      │
├─────────────────────────────────────────┤
│  Database (MongoDB via Prisma 6)        │
└─────────────────────────────────────────┘
```

## Request Flow

1. **Client component** calls a function from a client service (e.g., `sendReply()`)
2. **Client service** uses the centralized `apiClient()` in `lib/api-client.ts` to make a typed fetch call
3. **API route handler** in `pages/api/` validates the request body with Zod, calls a server-side service, and returns JSON
4. **Server service** in `features/*/services/` executes business logic and Prisma queries
5. **Response** flows back through the same layers

## Directory Structure

| Directory     | Purpose                                             | Runtime         |
| ------------- | --------------------------------------------------- | --------------- |
| `app/`        | Page components, layouts, loading/error states      | Server + Client |
| `pages/api/`  | REST API route handlers (31 endpoints)              | Server only     |
| `features/`   | Feature modules (10 modules, see below)             | Mixed           |
| `components/` | Shared UI primitives (Button, Card, Skeleton, etc.) | Client          |
| `lib/`        | Infrastructure (Prisma client, API client, auth)    | Mixed           |
| `prisma/`     | Database schema (14 models) and seed script         | Server only     |
| `.github/`    | CI pipeline (GitHub Actions)                        | CI              |

## Feature Module Convention

Each feature in `features/` follows a consistent structure:

```
features/tickets/
  components/       → React components (UI only)
  services/
    ticket-service.ts          → Server-side Prisma queries
    ticket-client-service.ts   → Client-side API calls
  types/
    ticket.ts                  → TypeScript interfaces
  utils/
    highlight-text.tsx         → Pure functions (tested)
```

### Feature Modules

| Module           | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `tickets/`       | Inbox, ticket detail, replies, internal notes |
| `ai-drafts/`     | AI draft generation, provider chain, tones    |
| `workflows/`     | Rule engine, triggers, actions                |
| `auth/`          | Login, sessions, RBAC, permissions            |
| `analytics/`     | Dashboard metrics and charts                  |
| `audit/`         | Audit log viewer with filtering               |
| `tags/`          | Ticket categorization                         |
| `saved-replies/` | Response templates                            |
| `sla/`           | SLA policy tracking and breach detection      |
| `notifications/` | User notifications (stub)                     |

**Rules:**

- Components never call Prisma or `fetch()` directly
- Server services are imported only in API routes and other server services
- Client services are imported only in client components
- Types are shared across both runtimes

## API Route Pattern

Every API handler follows the same structure:

```typescript
export default async function handler(req, res) {
  // 1. Method guard
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  // 2. Validate with Zod
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ message: "Invalid request", errors: result.error.flatten() });
  }
  // 3. Call service
  const data = await someService(result.data);
  // 4. Return response
  return res.status(200).json({ data });
}
```

## Authentication & Sessions

- Passwords are hashed with bcryptjs (10 rounds)
- Sessions are signed JWTs created with `jose` (HS256, 24h expiry)
- The JWT is stored in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production)
- Server components read sessions via `cookies()` from `next/headers`
- API routes receive the cookie automatically with each request
- A `SESSION_SECRET` environment variable is required

## Role-Based Access Control

Three roles with hierarchical permissions:

| Role         | Scope                                                               |
| ------------ | ------------------------------------------------------------------- |
| `admin`      | All permissions — user management, workflows, analytics, audit logs |
| `supervisor` | Read-only analytics, audit logs, ticket assignment, saved replies   |
| `agent`      | Ticket read/reply, AI draft generation                              |

11 granular permissions are defined in `role-service.ts`: `tickets:read`, `tickets:assign`, `tickets:manage-tags`, `workflows:read`, `workflows:manage`, `saved-replies:read`, `saved-replies:manage`, `analytics:read`, `ai-logs:read`, `audit-logs:read`, `users:manage`.

Server-side guards:

- `requireUser()` — any authenticated user
- `requireAdmin()` — admin only
- `requireSupervisor()` — admin or supervisor
- `requirePermission(permission)` — checks specific permission

API routes use `requireApiAuth()` and `requireApiPermission()` from `lib/api-auth.ts`.

## AI Provider System

The AI draft feature uses a provider interface (`AiDraftProvider`) with a fallback chain:

1. **OpenAI** — Chat Completions API (if `OPENAI_API_KEY` is set)
2. **Anthropic** — Messages API via fetch (if `ANTHROPIC_API_KEY` is set)
3. **Mock** — deterministic template responses (always available)

The `AiProviderChain` in `ai-provider-chain.ts` tries each configured provider in order. If one fails, it falls back to the next. All attempts are logged to `AiUsageLog` with provider name, model, token counts, and success/error status.

### Tone Support

Drafts can be generated in four tones: `professional`, `friendly`, `concise`, `empathetic`. The tone is injected into the system prompt for real providers and drives template selection for the mock provider.

### Ticket Classification

`classification-service.ts` provides automatic ticket categorization using keyword-based rules with an optional OpenAI enhancement.

## Workflow Engine

Workflow rules are stored as database records with:

- A **trigger** (JSON string): `{ field, operator, value }`
- An **actions** array (JSON): `[{ type, value }]`

The engine evaluates triggers against ticket data and executes matching actions. Supported actions: `change-status`, `assign-ticket`, `generate-draft`, `add-tag`. Workflows can run manually (per ticket) or automatically on trigger match. The engine includes loop prevention to avoid recursive execution. Results are logged as `ActivityLog` entries.

## Naming Conventions

- **Files and folders**: kebab-case (`ticket-service.ts`, `ai-draft-panel.tsx`)
- **Components**: PascalCase (`TicketList`, `AiDraftPanel`)
- **Services**: camelCase functions (`fetchTickets()`, `createWorkflowRule()`)
- **Types**: PascalCase interfaces (`Ticket`, `WorkflowRule`)
- **API routes**: kebab-case paths (`/api/tickets/[ticket-id]/status`)

## Testing

- **Framework:** Vitest 4 with path alias support
- **Test files:** 6 suites covering role service, AI provider chain, mock AI provider, workflow utilities, API auth middleware, and API client
- **Pattern:** Unit tests for pure logic and service layers; API route tests use mocked Prisma and session utilities

## Infrastructure

- **CI:** GitHub Actions pipeline (`.github/workflows/ci.yml`) runs lint, type-check, tests, and build on push/PR to master
- **Docker:** Multi-stage `Dockerfile` (Alpine, non-root user) with `docker-compose.yml` for local development (MongoDB 7 + Next.js)
- **Database indexes:** Optimized indexes on Ticket, Message, ActivityLog, Notification, Draft, and EmailLog for common query patterns
