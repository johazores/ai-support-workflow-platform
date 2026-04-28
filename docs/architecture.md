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

| Directory     | Purpose                                              | Runtime         |
| ------------- | ---------------------------------------------------- | --------------- |
| `app/`        | Page components, layouts, global styles              | Server + Client |
| `pages/api/`  | REST API route handlers                              | Server only     |
| `features/`   | Feature modules (components, services, types, utils) | Mixed           |
| `components/` | Shared UI primitives (Button, Card, Input, etc.)     | Client          |
| `lib/`        | Infrastructure (Prisma client, API client, hooks)    | Mixed           |
| `prisma/`     | Database schema and seed script                      | Server only     |

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
- The JWT is stored in an `HttpOnly`, `SameSite=Lax` cookie
- Server components read sessions via `cookies()` from `next/headers`
- API routes receive the cookie automatically with each request
- A `SESSION_SECRET` environment variable is required

## AI Provider System

The AI draft feature uses a provider interface (`AiDraftProvider`) so the implementation can be swapped via the `AI_PROVIDER` environment variable:

- `mock` — returns a deterministic template response (default for development)
- `openai` — calls the OpenAI Chat Completions API

Both providers implement the same interface, making it straightforward to add new providers (Claude, Gemini, etc.).

## Workflow Engine

Workflow rules are stored as database records with:

- A **trigger** (JSON string): `{ field, operator, value }`
- An **actions** array (JSON): `[{ type, value }]`

The engine evaluates triggers against ticket data and executes matching actions. Workflows can run manually (per ticket) or automatically on trigger match. Results are logged as activity entries.

## Naming Conventions

- **Files and folders**: kebab-case (`ticket-service.ts`, `ai-draft-panel.tsx`)
- **Components**: PascalCase (`TicketList`, `AiDraftPanel`)
- **Services**: camelCase functions (`fetchTickets()`, `createWorkflowRule()`)
- **Types**: PascalCase interfaces (`Ticket`, `WorkflowRule`)
- **API routes**: kebab-case paths (`/api/tickets/[ticket-id]/status`)
