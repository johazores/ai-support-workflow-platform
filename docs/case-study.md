# Case Study: AI Support Workflow Platform

### Problem

Customer support teams deal with repetitive tasks: triaging incoming tickets, drafting similar responses, routing issues to the right person, and keeping status consistent. Building a tool that automates these patterns requires solving several non-trivial engineering problems — AI integration, a rule-based workflow engine, multi-mailbox email processing, secure session management, and a maintainable architecture that can grow.

### What I Built

A full-stack helpdesk application where support agents can manage tickets, generate AI-powered draft replies, and configure workflow automation rules. The system handles the full lifecycle: inbound email → triage → response → resolution → CSAT feedback.

#### Key Capabilities

- **AI Draft Generation** — agents select a tone (professional, friendly, concise, empathetic) and generate a context-aware reply. A provider chain tries OpenAI → Anthropic → mock fallback, with all attempts logged for cost tracking.
- **Workflow Automation** — admins define rules with structured triggers (`subject contains "billing"`) and actions (`assign to Jordan`, `change status to pending`, `add tag`, `generate draft`). Rules execute manually or automatically with loop prevention.
- **Multi-Mailbox Email** — configure multiple SMTP/IMAP mailboxes (support@, sales@, billing@). Inbound emails auto-create tickets and thread replies via In-Reply-To headers. Outbound replies route through the originating mailbox. All mailboxes poll in parallel with independent failure handling.
- **Ticket Management** — search across subjects, names, and message bodies with highlighted matches. Full conversation threads with replies, internal notes with @mention autocomplete, tags, priority management, and SLA tracking.
- **RBAC** — three roles (admin, supervisor, agent) with 12 granular permissions enforced on every API route and admin page.
- **Customer Experience** — CSAT ratings on closed tickets, customer history sidebar, bulk operations for high-volume queues.
- **Analytics** — dashboard with ticket volume trends, status/priority breakdowns, and response time metrics.
- **Audit Trail** — filterable audit log viewer for all ticket activity with cursor-based pagination.
- **Real-Time Updates** — SSE-powered live ticket updates and notification bell with unread count.
- **Dark Mode** — system-preference detection with manual override, persisted in localStorage.

### Engineering Decisions

#### Layered Architecture

I split the codebase into three clear layers: client services (API calls), API route handlers (validation + delegation), and server services (business logic + database). Components never touch `fetch()` or Prisma directly. This makes each layer independently testable and keeps concerns separated.

#### Provider Pattern for AI

Rather than hardcoding a single AI API, I defined an `AiDraftProvider` interface and built an `AiProviderChain` that tries each configured provider in sequence. OpenAI and Anthropic are supported, with a mock fallback for development. All attempts are logged to `AiUsageLog` with provider, model, token counts, and error details. Adding a new provider means implementing one interface — no changes elsewhere.

#### Multi-Mailbox Design

The initial email system used a singleton `EmailConfig` — one mailbox for the entire application. I refactored this to support multiple mailboxes, each with independent SMTP/IMAP credentials and a unique `fromAddress`. The `isDefault` flag ensures backward compatibility while enabling department-specific mailboxes. `Promise.allSettled()` polling means one broken mailbox doesn't block the others. `mailboxId` on `EmailLog` and `Ticket` enables per-mailbox analytics.

#### JWT Sessions Over Plain Cookies

The initial prototype stored session data as Base64-encoded JSON in cookies — trivially forgeable. I replaced this with signed JWTs using `jose` (HS256, 24h expiry). The token is stored in an HttpOnly, SameSite=Strict cookie with the Secure flag in production. A `SESSION_SECRET` environment variable is required.

#### Role-Based Access Control

I implemented a three-tier RBAC system (admin, supervisor, agent) with 12 granular permissions. Every API route validates authentication and authorization through reusable middleware (`requireApiAuth`, `requireApiPermission`). Server-rendered pages use auth guards that redirect unauthorized users.

#### Thin API Handlers

Every API route follows the same four-step pattern: method guard → Zod validation → service call → JSON response. Business logic never leaks into the handler. This consistency makes the API predictable and easy to audit.

#### Feature Module Convention

With 14 feature modules, the codebase needed a consistent organizational pattern. Each module has the same internal structure (`components/`, `services/`, `types/`, `utils/`), making it predictable where to find any piece of code. New features follow the template without discussion.

### Technical Tradeoffs

| Decision                    | Tradeoff                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------- |
| MongoDB over PostgreSQL     | Flexible document model for JSON triggers/actions, but weaker relational integrity |
| Pages Router for APIs       | Familiar, explicit handlers, but two routing systems coexist                       |
| JWT without revocation      | Simple and stateless, but no server-side session invalidation without a blocklist  |
| Feature folders             | Co-located code, but shared utilities must live outside `features/`                |
| Provider chain fallback     | Resilient AI generation, but adds complexity over a single-provider setup          |
| SSE over WebSockets         | Simpler server implementation, but unidirectional (server → client only)           |
| Multi-mailbox via DB config | Flexible per-mailbox settings, but more complex credential management              |
| Class-based dark mode       | Explicit user control, but every component needs `dark:` variants                  |
| CSAT on closed tickets only | Clean end-of-journey feedback, but no mid-conversation sentiment tracking          |
| Bulk ops non-atomic         | Individual failures don't block the batch, but partial failures are possible       |

### What I'd Do Next

- **Rate limiting** — protect API endpoints from abuse with per-user throttling.
- **End-to-end tests** — add Playwright tests for critical user flows (login → triage → reply → resolve).
- **Server-side session revocation** — add a blocklist to support forced logout.
- **File attachments** — support image and document uploads on tickets.
- **Encrypted credentials** — store mailbox passwords with AES encryption at rest.
- **Connection pooling** — reuse IMAP connections across poll cycles for performance.
- **Webhook integrations** — Slack/Teams notifications for new tickets and SLA breaches.

### Stack

Next.js 16 · TypeScript 5 · React 19 · MongoDB · Prisma 6 · Tailwind CSS 4 · Zod 4 · jose · bcryptjs · OpenAI SDK 6 · Nodemailer · Vitest 4 · GitHub Actions · Docker
