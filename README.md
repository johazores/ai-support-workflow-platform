# AI Support Workflow Platform

A full-stack customer support application with AI-powered draft replies, configurable workflow automation, and role-based access control. Built as a portfolio project to demonstrate production-level patterns: layered architecture, type-safe APIs, signed JWT sessions, RBAC, and a provider-based AI integration with fallback chain.

**Live demo credentials** — after seeding, log in with `alex@company.com` / `admin123`.

---

## Why This Project

Most support tools are either toy CRUD apps or massive SaaS products. This project sits in between: a realistic helpdesk that solves real problems — automated triage, AI-assisted replies, and rule-based workflows — while keeping the codebase small enough to read end-to-end.

Key engineering challenges addressed:

- **AI integration** with a swappable provider interface (mock for dev, OpenAI for production)
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
- Ticket assignment to team members
- Internal notes visible only to the support team

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

### Admin

- Workflow rule management (create, toggle, delete)
- AI usage log dashboard
- Analytics dashboard (ticket volume, response time, status/priority breakdown)
- Audit log viewer with type filtering and pagination
- Saved reply template management
- Role-based access (admin, supervisor, agent) with 11 granular permissions

### Authentication & Security

- Signed JWT sessions with `SESSION_SECRET` (HS256, 24h expiry)
- Login/logout with bcrypt password verification
- Protected routes via server-side auth guard
- RBAC middleware on all API routes (`requireApiAuth`, `requireApiPermission`)
- Hardened cookies: HttpOnly, SameSite=Strict, Secure in production

### Real-Time & Email

- SSE endpoint for live ticket updates with heartbeat keepalive
- Notification bell with unread count
- Inbound email webhook with HMAC signature verification
- Outbound email dispatch via provider interface

### Production Polish

- Loading skeletons and error boundaries on all major routes
- Database indexes for common query patterns
- GitHub Actions CI (lint, type-check, test, build)
- Docker and Docker Compose for local development

---

## Project Structure

```
app/                  → Pages (App Router, server components)
pages/api/            → API routes (Pages Router, 31 endpoints)
features/
  tickets/            → Ticket components, services, types
  ai-drafts/          → AI draft generation, provider chain, tones
  workflows/          → Workflow rules, engine, utilities
  auth/               → Login, sessions, RBAC, permissions
  analytics/          → Metrics dashboard, chart components
  audit/              → Audit log viewer
  tags/               → Ticket tags (coming soon: UI wired)
  saved-replies/      → Response templates
  sla/                → SLA policy tracking
  notifications/      → User notifications
components/
  layout/             → App header, navigation
  ui/                 → Reusable UI primitives (Button, Card, Skeleton, etc.)
lib/                  → Shared infrastructure (Prisma client, API client, auth)
prisma/               → Schema (14 models) and seed data
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
npm test              # run once
npm run test:watch    # watch mode
```

---

## Documentation

- [Architecture](docs/architecture.md) — system design, data flow, RBAC, conventions
- [Architecture Decisions](docs/architecture-decisions.md) — ADRs explaining key choices
- [Roadmap](docs/roadmap.md) — completed features and future plans
- [Case Study](docs/case-study.md) — project motivation and engineering tradeoffs

---

## Docker

Run the full stack locally with Docker Compose:

```bash
docker compose up --build
```

This starts MongoDB 7 and the Next.js app at [http://localhost:3000](http://localhost:3000).

---

## Future Improvements

- Rate limiting on API routes
- Server-side session revocation
- File attachments on tickets
- End-to-end tests (Playwright)
- Customer-facing portal

---

## Why This Project

This project demonstrates:

- Clean architecture (feature-based structure with 10 modules)
- Separation of concerns (API, services, UI)
- Workflow engine with loop prevention
- AI integration with provider chain and fallback
- RBAC with granular permissions
- Real-time updates via SSE
- Security hardening (OWASP-aligned)
- CI/CD and containerization
- Testing strategy (unit + integration)

---

## Author

Johanssen Azores
