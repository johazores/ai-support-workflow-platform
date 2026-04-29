# AI Support Workflow Platform

A full-stack customer support application with AI-powered draft replies, multi-mailbox email integration, configurable workflow automation, and role-based access control. Built as a portfolio project to demonstrate production-level patterns: layered architecture, type-safe APIs, signed JWT sessions, RBAC, and a provider-based AI integration with fallback chain.

**Live demo credentials** — after seeding, log in with `alex@company.com` / `admin123`.

---

## Why This Project

Most support tools are either toy CRUD apps or massive SaaS products. This project sits in between: a realistic helpdesk that solves real problems — automated triage, AI-assisted replies, multi-mailbox email, and rule-based workflows — while keeping the codebase small enough to read end-to-end.

Key engineering challenges addressed:

- **AI integration** with a swappable provider interface (mock for dev, OpenAI/Anthropic for production)
- **Multi-mailbox email** with SMTP/IMAP per mailbox, parallel inbox polling, and per-mailbox delivery logs
- **Workflow engine** with a JSON-based trigger/action model that supports automatic and manual execution
- **Session security** using signed JWTs (`jose`) instead of plain cookies
- **Layered service architecture** separating API handlers, business logic, and data access
- **Centralized API client** eliminating raw `fetch()` calls across all client components

---

## Tech Stack

| Layer            | Technology                                 |
| ---------------- | ------------------------------------------ |
| Framework        | Next.js 16 (App Router + Pages API routes) |
| Language         | TypeScript 5 (strict mode)                 |
| Database         | MongoDB + Prisma 6                         |
| Styling          | Tailwind CSS 4                             |
| Validation       | Zod 4                                      |
| Auth             | Signed JWTs via `jose`                     |
| AI               | OpenAI SDK 6 + Anthropic (provider chain)  |
| Email            | Nodemailer (SMTP) + imap + mailparser      |
| Testing          | Vitest 4                                   |
| Password hashing | bcryptjs                                   |
| CI               | GitHub Actions                             |
| Containers       | Docker + Docker Compose                    |

---

## Features

### Inbox & Tickets

- Ticket list with real-time search across subjects, customer names, emails, and message bodies
- Highlighted search matches in results
- Full conversation thread with customer and support messages
- Status management (open → pending → resolved → closed)
- Priority management (low, normal, high, urgent) with inline editing
- Ticket assignment to team members
- Internal notes with @mention autocomplete
- Tag picker with filtering on the ticket list
- Color-coded activity timeline by event type
- Customer history sidebar showing previous tickets
- Email thread indicators on messages

### AI Draft Replies

- One-click AI draft generation with tone selection (professional, friendly, concise, empathetic)
- Provider chain: OpenAI → Anthropic → mock fallback with automatic failover
- Save, edit, and send drafts as replies
- AI usage logging for monitoring and cost tracking
- Ticket classification service (keyword + AI-powered)

### Workflow Automation

- Rule builder with structured triggers (field + operator + value)
- Configurable actions: change status, assign ticket, generate AI draft, add tag
- Manual execution per ticket or automatic trigger on match
- Enable/disable rules without deleting them
- Execution results logged as activity

### Email Integration

- Multi-mailbox support — configure multiple SMTP/IMAP mailboxes
- Default mailbox selection with per-mailbox active/inactive toggle
- IMAP polling of all active mailboxes in parallel via `pollAllInboxes()`
- Single-mailbox polling via `pollInboxById()`
- Inbound email processing: auto-creates tickets and threads replies via In-Reply-To
- Outbound SMTP delivery with per-mailbox sender identity
- Email delivery logs with mailbox tracking and status filter
- Email template builder with variable placeholders and live preview

### Admin

- Workflow rule management (create, toggle, delete)
- AI usage log dashboard
- User management (create, edit roles, delete)
- SLA policy editor with inline editing
- Customer directory with search and ticket counts
- Email log viewer with status filter and pagination
- Multi-mailbox configuration UI (list, create, edit, delete)
- Email template builder
- Analytics dashboard (ticket volume, response time, status/priority breakdown)
- Audit log viewer with type filtering and pagination

### Customer Experience

- CSAT rating widget on closed tickets (1–5 score + optional comment)
- Bulk ticket operations (assign, change status, change priority) with multi-select UI

### Authentication & Security

- Signed JWT sessions with `SESSION_SECRET` (HS256, 24h expiry)
- Login/logout with bcrypt password verification
- Protected routes via server-side auth guard
- RBAC with three roles (admin, supervisor, agent) and 12 granular permissions
- RBAC middleware on all API routes (`requireApiAuth`, `requireApiPermission`)
- Hardened cookies: HttpOnly, SameSite=Strict, Secure in production

### Real-Time Updates

- SSE endpoint for live ticket updates with heartbeat keepalive
- Notification bell with unread count
- Client hook for auto-refresh on new messages

### UI & Accessibility

- Dark mode with system-preference detection and manual toggle
- Loading skeletons and error boundaries on all major routes
- Empty states with contextual guidance
- Toast notifications for user feedback

### Production Readiness

- 42 unit tests across 7 test files (Vitest 4)
- GitHub Actions CI (lint, type-check, test, build)
- Docker and Docker Compose (multi-stage build, non-root user)
- Database indexes for common query patterns
- Security audit and hardening (cookie flags, input bounds, Zod validation)

---

## Project Structure

```
app/                  → Pages (App Router, server components)
pages/api/            → API routes (Pages Router, 39 endpoints)
features/
  ai-drafts/          → AI draft generation, provider chain, tones
  analytics/          → Metrics dashboard, chart components
  audit/              → Audit log viewer
  auth/               → Login, sessions, RBAC, permissions
  csat/               → Customer satisfaction ratings
  customers/          → Customer directory with search
  email/              → Multi-mailbox config, SMTP, IMAP, templates
  email-logs/         → Email delivery log viewer
  notifications/      → User notifications, SSE
  saved-replies/      → Response templates
  sla/                → SLA policy tracking
  tags/               → Ticket tags
  tickets/            → Ticket components, services, email ingestion
  workflows/          → Workflow rules, engine, utilities
components/
  layout/             → App header, navigation
  ui/                 → 14 reusable UI primitives (Button, Card, Skeleton, etc.)
lib/                  → Shared infrastructure (Prisma client, API client, auth)
prisma/               → Schema (16 models) and seed data
.github/workflows/    → CI pipeline
docs/                 → Architecture docs, decisions, roadmap
```

Each feature follows the same convention:

- `components/` — React components (UI only, no direct data fetching)
- `services/` — Business logic and data access (server-side), API client calls (client-side)
- `types/` — TypeScript interfaces specific to the feature
- `utils/` — Pure utility functions with unit tests

---

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone and install

```bash
git clone https://github.com/johazores/ai-support-workflow-platform.git
cd ai-support-workflow-platform
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mongodb+srv://..."
SESSION_SECRET="generate-a-random-string-at-least-32-chars"
OPENAI_API_KEY=""               # optional, enables OpenAI provider
OPENAI_MODEL="gpt-4.1-mini"
ANTHROPIC_API_KEY=""            # optional, enables Anthropic provider
ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

### 3. Set up database

```bash
npm run db:setup
```

This pushes the Prisma schema to MongoDB and seeds sample data (2 users, 6 customers, 10 tickets, 3 workflow rules).

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

| Account    | Email              | Password   | Role       |
| ---------- | ------------------ | ---------- | ---------- |
| Admin      | alex@company.com   | admin123   | admin      |
| Supervisor | sam@company.com    | super123   | supervisor |
| Agent      | jordan@company.com | support123 | agent      |

---

## Testing

```bash
npm test          # Run all tests (42 tests, 7 files)
npm run test:ui   # Interactive test UI
```

Test coverage includes: role/permission service, AI provider chain, mock AI provider, API auth middleware, API client, utility functions, workflow utilities.

---

## Docker

```bash
docker-compose up --build
```

Services: `app` (Next.js on port 3000), `mongo` (MongoDB on port 27017). The Dockerfile uses multi-stage builds with a non-root user.

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for full system architecture, including the layered service pattern, RBAC model, AI provider system, multi-mailbox email integration, and workflow engine.

See [docs/architecture-decisions.md](docs/architecture-decisions.md) for ADRs covering all major technical choices.

See [docs/case-study.md](docs/case-study.md) for the engineering narrative and tradeoff analysis.

---

## Author

Johanssen Azores
