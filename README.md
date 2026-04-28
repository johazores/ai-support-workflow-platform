# AI Support Workflow Platform

A full-stack customer support application with AI-powered draft replies and configurable workflow automation. Built as a portfolio project to demonstrate production-level patterns: layered architecture, type-safe APIs, signed JWT sessions, and a provider-based AI integration.

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
| AI               | OpenAI SDK 6 (provider pattern)            |
| Testing          | Vitest 4                                   |
| Password hashing | bcryptjs                                   |

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

- One-click AI draft generation from ticket context
- Provider interface: swap between OpenAI and a mock provider via environment variable
- Save, edit, and send drafts as replies
- AI usage logging for monitoring and cost tracking

### Workflow Automation

- Rule builder with structured triggers (field + operator + value)
- Configurable actions: change status, assign ticket, generate AI draft
- Manual execution per ticket or automatic trigger on match
- Enable/disable rules without deleting them
- Execution results logged as activity

### Admin

- Workflow rule management (create, toggle, delete)
- AI usage log dashboard
- Role-based access (admin vs. support)

### Authentication

- Signed JWT sessions with `SESSION_SECRET`
- Login/logout with bcrypt password verification
- Protected routes via server-side auth guard

---

## Project Structure

```
app/                  → Pages (App Router, server components)
pages/api/            → API routes (Pages Router, thin handlers)
features/
  tickets/            → Ticket components, services, types
  ai-drafts/          → AI draft generation, saving, sending
  workflows/          → Workflow rules, engine, utilities
  auth/               → Login, sessions, auth guard
components/
  layout/             → App header, navigation
  ui/                 → Reusable UI primitives (Button, Card, Input, etc.)
lib/                  → Shared infrastructure (Prisma client, API client, hooks)
prisma/               → Schema and seed data
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
AI_PROVIDER="mock"              # or "openai"
OPENAI_API_KEY=""               # required if AI_PROVIDER=openai
OPENAI_MODEL="gpt-4.1-mini"
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

| Account | Email              | Password   | Role    |
| ------- | ------------------ | ---------- | ------- |
| Admin   | alex@company.com   | admin123   | admin   |
| Support | jordan@company.com | support123 | support |

---

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
```

---

## Documentation

- [Architecture](docs/architecture.md) — system design, data flow, conventions
- [Architecture Decisions](docs/architecture-decisions.md) — ADRs explaining key choices
- [Roadmap](docs/roadmap.md) — planned features and priorities
- [Case Study](docs/case-study.md) — project motivation and engineering tradeoffs

Watch mode:

```bash
npm run test:watch
```

---

## Future Improvements

- Email ingestion (IMAP / webhook)
- Real-time updates (WebSockets)
- Attachments support
- Pagination
- Advanced analytics dashboard
- Multi-user collaboration

---

## Why This Project

This project demonstrates:

- Clean architecture (feature-based structure)
- Separation of concerns (API, services, UI)
- Workflow engine design
- AI integration with provider abstraction
- Real-world support system features
- Testing and maintainability

---

## Author

Johanssen Azores
