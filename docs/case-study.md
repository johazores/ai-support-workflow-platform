# Case Study: AI Support Workflow Platform

## Problem

Customer support teams deal with repetitive tasks: triaging incoming tickets, drafting similar responses, routing issues to the right person, and keeping status consistent. Building a tool that automates these patterns requires solving several non-trivial engineering problems — AI integration, a rule-based workflow engine, secure session management, and a maintainable architecture that can grow.

## What I Built

A full-stack helpdesk application where support agents can manage tickets, generate AI-powered draft replies, and configure workflow automation rules. The system handles the full lifecycle: customer inquiry → triage → response → resolution.

### Key Capabilities

- **AI Draft Generation** — agents click a button to generate a context-aware reply using the ticket's subject, customer name, and message history. The AI provider is swappable via environment variable.
- **Workflow Automation** — admins define rules with structured triggers (`subject contains "billing"`) and actions (`assign to Jordan`, `change status to pending`). Rules execute manually or automatically.
- **Ticket Management** — search across subjects, names, and message bodies with highlighted matches. Full conversation threads with support replies and internal-only notes.

## Engineering Decisions

### Layered Architecture

I split the codebase into three clear layers: client services (API calls), API route handlers (validation + delegation), and server services (business logic + database). Components never touch `fetch()` or Prisma directly. This makes each layer independently testable and keeps concerns separated.

### Provider Pattern for AI

Rather than hardcoding OpenAI calls, I defined an `AiDraftProvider` interface. A mock provider returns deterministic responses during development; the OpenAI provider calls the Chat Completions API in production. Adding a new provider means implementing one function — no changes elsewhere.

### JWT Sessions Over Plain Cookies

The initial prototype stored session data as Base64-encoded JSON in cookies — trivially forgeable. I replaced this with signed JWTs using `jose` (HS256, 24h expiry). The token is stored in an HttpOnly cookie, and a `SESSION_SECRET` environment variable is required to start the application.

### Thin API Handlers

Every API route follows the same four-step pattern: method guard → Zod validation → service call → JSON response. Business logic never leaks into the handler. This consistency makes the API predictable and easy to audit.

### Centralized Fetch Client

All client-side API calls go through a single `apiClient<T>()` function that handles Content-Type headers, JSON serialization, and structured error extraction. This eliminated scattered `fetch()` calls and provides a single point for future enhancements (auth headers, retries, request logging).

## Technical Tradeoffs

| Decision                | Tradeoff                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------- |
| MongoDB over PostgreSQL | Flexible document model for JSON triggers/actions, but weaker relational integrity |
| Pages Router for APIs   | Familiar, explicit handlers, but two routing systems coexist                       |
| JWT without revocation  | Simple and stateless, but no server-side session invalidation without a blocklist  |
| Feature folders         | Co-located code, but shared utilities must live outside `features/`                |
| Mock AI provider        | Fast development without API costs, but doesn't test prompt quality                |

## What I'd Do Differently

- **Start with integration tests** — the workflow engine and AI draft pipeline are complex enough to warrant test coverage from day one.
- **Add SSE earlier** — real-time updates would have improved the development experience while building multi-agent ticket workflows.
- **Use a monorepo tool** — as the codebase grows, separating the API and UI into packages would improve build times and dependency boundaries.

## Stack

Next.js 16 · TypeScript 5 · React 19 · MongoDB · Prisma 6 · Tailwind CSS 4 · Zod 4 · jose · OpenAI SDK 6 · Vitest 4
