# Architecture

## System Overview

The application follows a **three-layer architecture** within a single Next.js deployment:

```
┌─────────────────────────────────────────────────────┐
│                     Client Layer                     │
│  App Router pages → React components → API client   │
├─────────────────────────────────────────────────────┤
│                      API Layer                       │
│  Pages Router handlers → Zod validation → auth MW   │
├─────────────────────────────────────────────────────┤
│                    Service Layer                     │
│  Business logic → Prisma ORM → MongoDB              │
└─────────────────────────────────────────────────────┘
```

**Request flow:** Component → `apiClient()` → API route → auth check → Zod validate → service → Prisma → MongoDB → JSON response → Component state.

---

## Directory Structure

| Directory            | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `app/`               | App Router pages (server components, layouts)    |
| `pages/api/`         | API routes (39 endpoints, Pages Router)          |
| `features/`          | 14 feature modules (see below)                   |
| `components/ui/`     | 14 shared UI primitives                          |
| `components/layout/` | App header, navigation                           |
| `lib/`               | Shared infrastructure (Prisma, API client, auth) |
| `prisma/`            | Schema (16 models), seed script                  |
| `docs/`              | Architecture docs, ADRs, roadmap                 |

---

## Feature Module Convention

Each of the 14 feature modules under `features/` follows a consistent structure:

```
features/<module>/
  components/    → React UI components
  services/      → Server-side business logic + client-side API calls
  types/         → TypeScript interfaces
  utils/         → Pure functions + tests
```

**Feature modules:** ai-drafts, analytics, audit, auth, csat, customers, email, email-logs, notifications, saved-replies, sla, tags, tickets, workflows.

This convention enforces separation of concerns: components never import Prisma, services never render JSX, and types are scoped to their domain.

---

## API Route Pattern

Every API route follows a four-step pattern:

```typescript
export default async function handler(req, res) {
  // 1. Method guard
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  // 2. Auth + RBAC
  const auth = await requireApiPermission(req, res, "tickets:write");
  if (!auth.ok) return;

  // 3. Zod validation
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ message: "Invalid input", errors: parsed.error.flatten() });

  // 4. Service call → JSON response
  const result = await someService(parsed.data);
  return res.status(200).json({ data: result });
}
```

All responses use the `{ data: ... }` wrapper convention. The client `apiClient<T>()` function handles JSON serialization, error extraction, and type safety.

---

## Authentication & Sessions

- **Login:** bcrypt password verification → JWT creation via `jose` (HS256, 24h expiry)
- **Storage:** HttpOnly cookie, `SameSite=Strict`, `Secure` in production
- **Verification:** Every API route calls `requireApiAuth()` or `requireApiPermission()` which decodes and validates the JWT
- **Page protection:** Server-side auth guards (`requireUser`, `requireSupervisor`, `requirePermission`) redirect unauthorized users

No server-side session storage — tokens are stateless. Trade-off: no forced revocation without a blocklist.

---

## Role-Based Access Control (RBAC)

Three roles with 12 granular permissions:

| Permission        | Admin | Supervisor | Agent |
| ----------------- | ----- | ---------- | ----- |
| `tickets:read`    | ✓     | ✓          | ✓     |
| `tickets:write`   | ✓     | ✓          | ✓     |
| `tickets:assign`  | ✓     | ✓          |       |
| `tickets:delete`  | ✓     |            |       |
| `ai:generate`     | ✓     | ✓          | ✓     |
| `ai:view-logs`    | ✓     | ✓          |       |
| `workflows:read`  | ✓     | ✓          |       |
| `workflows:write` | ✓     |            |       |
| `users:read`      | ✓     | ✓          |       |
| `users:write`     | ✓     |            |       |
| `analytics:read`  | ✓     | ✓          |       |
| `email-logs:read` | ✓     | ✓          |       |

Permissions are defined in `features/auth/services/role-service.ts` and enforced at both the API layer (middleware) and the UI layer (conditional rendering).

---

## AI Provider System

The AI draft generation uses a **provider chain** pattern:

```
AiProviderChain → [OpenAiProvider, AnthropicProvider, MockAiProvider]
```

Each provider implements the `AiDraftProvider` interface:

```typescript
interface AiDraftProvider {
  name: string;
  generateDraft(context: DraftContext): Promise<DraftResult>;
}
```

The chain tries providers in order, falling back on failure. All attempts (success and failure) are logged to `AiUsageLog` with provider name, model, token counts, latency, and errors. This enables cost tracking and provider comparison.

**Tone system:** Agents select from professional, friendly, concise, or empathetic. The tone is passed as a system prompt modifier to the AI provider.

---

## Multi-Mailbox Email Architecture

The email system supports multiple independent mailboxes, each with its own SMTP and IMAP configuration:

```
┌──────────────────────────────────────────────────┐
│                EmailConfig (per mailbox)           │
│  name, fromAddress (unique), SMTP creds, IMAP creds│
│  isActive, isDefault                              │
├──────────────────────────────────────────────────┤
│                                                    │
│  Outbound (SMTP)          Inbound (IMAP)          │
│  ┌──────────────┐         ┌──────────────┐        │
│  │ sendEmail()  │         │pollAllInboxes│        │
│  │ + mailboxId  │         │  (parallel)  │        │
│  └──────┬───────┘         └──────┬───────┘        │
│         │                        │                 │
│         ▼                        ▼                 │
│  Nodemailer transport     IMAP → mailparser        │
│         │                        │                 │
│         ▼                        ▼                 │
│  EmailLog (mailboxId)     processInboundEmail()   │
│                           → Customer lookup        │
│                           → Thread via In-Reply-To │
│                           → Create/update Ticket   │
│                           → Classify + workflows   │
└──────────────────────────────────────────────────┘
```

### Key design decisions:

- **One config = one mailbox.** Each `EmailConfig` record has its own SMTP and IMAP credentials, enabling departments (support, sales, billing) to have separate email addresses.
- **`fromAddress` is unique.** Prevents duplicate mailbox registrations.
- **`isDefault` flag** ensures backward compatibility — `getEmailConfig()` returns the default active mailbox for existing code paths.
- **Parallel polling.** `pollAllInboxes()` uses `Promise.allSettled()` so one mailbox failure doesn't block others. Each result includes the mailbox name and any error.
- **Mailbox tracking.** `EmailLog.mailboxId` and `Ticket.mailboxId` trace which mailbox originated each interaction.
- **Email templates** are global (not per-mailbox), with variable placeholders (`{{customer_name}}`, `{{ticket_subject}}`, etc.) and a live preview editor.

---

## Workflow Engine

Workflows are JSON-based rules with triggers and actions:

```json
{
  "trigger": { "field": "subject", "operator": "contains", "value": "billing" },
  "actions": [
    { "type": "assign-ticket", "value": "jordan@company.com" },
    { "type": "change-status", "value": "pending" },
    { "type": "add-tag", "value": "billing" }
  ]
}
```

**Execution modes:**

- **Manual** — agents click "Run Workflow" on a ticket
- **Automatic** — rules execute on ticket creation (via email ingestion or API)

**Loop prevention:** A workflow execution context tracks which rules have already fired, preventing infinite trigger chains.

**Action types:** `change-status`, `assign-ticket`, `generate-draft`, `add-tag`.

---

## Real-Time Updates

- **SSE endpoint** (`/api/tickets/events`) streams ticket updates with a 30-second heartbeat
- **Client hook** (`useTicketEvents`) subscribes to the stream and auto-refreshes ticket data
- **Notifications** are stored in the database with read/unread state, surfaced via a notification bell in the header

---

## Database Schema

16 Prisma models backed by MongoDB:

| Model         | Purpose                                   |
| ------------- | ----------------------------------------- |
| User          | Support agents and admins                 |
| Customer      | End users who submit tickets              |
| Ticket        | Support requests with status and priority |
| Message       | Conversation messages (replies + notes)   |
| Draft         | AI-generated draft replies                |
| WorkflowRule  | Automation rules (triggers + actions)     |
| ActivityLog   | Audit trail for all ticket events         |
| AiUsageLog    | AI provider call logging (cost tracking)  |
| EmailConfig   | Multi-mailbox SMTP/IMAP configurations    |
| EmailLog      | Outbound email delivery tracking          |
| EmailTemplate | Reusable email templates with variables   |
| Notification  | User notifications (read/unread)          |
| Tag           | Ticket labels                             |
| SavedReply    | Reusable response templates               |
| SlaPolicy     | Service level agreement definitions       |
| CsatRating    | Customer satisfaction scores              |

---

## Testing Strategy

- **Unit tests** (Vitest 4): 42 tests across 7 files covering services, utilities, and middleware
- **Test targets:** Role permissions, AI provider chain + fallback, mock provider responses, API auth middleware, API client error handling, utility functions, workflow rule matching
- **CI pipeline** (GitHub Actions): lint → type-check → test → build on every push

---

## Infrastructure

- **Docker:** Multi-stage Dockerfile with non-root user, Docker Compose with MongoDB
- **CI:** GitHub Actions workflow running lint, tsc, vitest, and next build
- **Database indexes:** Defined in Prisma schema for common query patterns (ticket lookups, email log filtering, customer search)

---

## Naming Conventions

| Entity     | Convention        | Example                    |
| ---------- | ----------------- | -------------------------- |
| Files      | kebab-case        | `email-config-service.ts`  |
| Components | PascalCase        | `EmailConfigForm`          |
| Services   | camelCase exports | `getEmailConfigById()`     |
| API routes | kebab-case paths  | `/api/email-config/[id]`   |
| Types      | PascalCase        | `MailboxConfig`            |
| DB fields  | camelCase         | `fromAddress`, `isDefault` |
