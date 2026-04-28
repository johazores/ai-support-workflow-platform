# Architecture Decision Records

## ADR-1: App Router for pages, Pages Router for API routes

**Context:** Next.js supports both the App Router and Pages Router. We need to choose how to split responsibilities.

**Decision:** Use the App Router (`app/`) for all page rendering and the Pages Router (`pages/api/`) for all API routes.

**Rationale:** The App Router provides server components, streaming, and modern layouts. However, API route handlers in the App Router have a different signature and less ecosystem support. Pages Router API routes are explicit, well-documented, and easy to test with standard tools.

**Consequences:** Two routing systems coexist. Developers must know which directory to use for each concern.

---

## ADR-2: Feature-based folder structure without `src/`

**Context:** The codebase needs a clear organizational pattern that scales with feature count.

**Decision:** Group code by product feature under `features/` at the project root. No `src/` wrapper directory.

**Rationale:** Feature folders (`features/tickets/`, `features/workflows/`) keep related components, services, types, and utilities together. This reduces cross-directory navigation compared to grouping by technical layer (e.g., all services in one folder). Omitting `src/` reduces nesting depth by one level.

**Consequences:** Shared infrastructure lives in `lib/` and `components/`, which must stay free of feature-specific logic.

---

## ADR-3: Layered service architecture

**Context:** Components need data. API routes need business logic. We need to prevent tight coupling.

**Decision:** Enforce three layers per feature:

1. **Client services** — functions that call API endpoints via `apiClient()`
2. **API route handlers** — validate input with Zod, call server services, return JSON
3. **Server services** — execute business logic and Prisma queries

**Rationale:** Components never call `fetch()` or Prisma directly. This makes each layer independently testable and keeps API handlers thin (validation + delegation only).

**Consequences:** More files per feature, but each file has a single clear responsibility.

---

## ADR-4: Signed JWT sessions instead of plain cookies

**Context:** The initial implementation used Base64-encoded JSON in cookies, which is trivially forgeable.

**Decision:** Replace with signed JWTs using `jose` (HS256 algorithm, 24-hour expiry).

**Rationale:** JWTs provide tamper detection via HMAC signatures. The `jose` library is lightweight (no native dependencies), supports edge runtimes, and handles standard claims (exp, iat, sub).

**Consequences:** Requires a `SESSION_SECRET` environment variable. Sessions cannot be revoked server-side without adding a blocklist (acceptable for this scale).

---

## ADR-5: Provider pattern for AI integration

**Context:** AI draft generation should work in development (without API keys) and production (with real providers).

**Decision:** Define an `AiDraftProvider` interface with `generateDraft()`. Implement `mock` and `openai` providers. Select via the `AI_PROVIDER` environment variable.

**Rationale:** Developers can work on AI-related features without incurring API costs. Adding a new provider (Claude, Gemini) requires implementing one interface — no changes to the rest of the codebase.

**Consequences:** The mock provider returns deterministic responses that don't test prompt quality.

---

## ADR-6: MongoDB with Prisma ORM

**Context:** We need a database that supports flexible schemas and a type-safe query layer.

**Decision:** Use MongoDB as the database and Prisma as the ORM.

**Rationale:** MongoDB's document model maps naturally to ticket threads (nested messages, JSON workflow triggers/actions). Prisma provides auto-generated TypeScript types from the schema, preventing runtime type mismatches.

**Consequences:** Some Prisma features (e.g., migrations) have limited MongoDB support. We use `prisma db push` instead of migration files.

---

## ADR-7: Zod for request validation at API boundaries

**Context:** API routes receive untrusted input that must be validated before processing.

**Decision:** Use Zod schemas to validate all request bodies in API route handlers.

**Rationale:** Zod provides runtime validation with TypeScript type inference, eliminating the need for separate type definitions and validation logic. Validation errors are returned in a structured format via `error.flatten()`.

**Consequences:** Zod schemas are defined per-route. Shared schemas can be extracted to feature `types/` directories if reuse is needed.

---

## ADR-8: Centralized API client

**Context:** Client components were making raw `fetch()` calls with inconsistent error handling.

**Decision:** Create a single `apiClient<T>()` function in `lib/api-client.ts` that handles headers, JSON serialization, and error extraction. All client services use it exclusively.

**Rationale:** Eliminates duplicated fetch boilerplate. Provides a single point for adding auth headers, retries, or request logging in the future.

**Consequences:** All API calls flow through one function, making it easy to audit network behavior.

---

## ADR-9: Activity logging for audit trail

**Context:** Support operations (status changes, assignments, workflow runs) need to be traceable.

**Decision:** Log key actions as `ActivityLog` records linked to tickets.

**Rationale:** An audit trail is essential for any support tool. Logging at the service layer (not the API layer) ensures consistency regardless of how the action is triggered.

**Consequences:** Activity logs grow over time. Pagination or archival may be needed at scale.
