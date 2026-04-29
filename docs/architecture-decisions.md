# Architecture Decision Records

## ADR-1: Next.js with Dual Routing

**Status:** Accepted

**Context:** The application needs server-rendered pages for SEO and initial load performance, plus API endpoints for client-side interactions.

**Decision:** Use Next.js App Router for pages and Pages Router for API routes.

**Rationale:** App Router provides React Server Components and layouts. Pages Router gives explicit, file-based API handlers with full request/response control. While two routing systems coexist, the separation is clean: `app/` for UI, `pages/api/` for data.

**Consequences:** Developers must understand both routers. API routes cannot use App Router features like Server Actions.

---

## ADR-2: MongoDB with Prisma ORM

**Status:** Accepted

**Context:** The data model includes JSON-structured triggers/actions (workflows), nested message threads, and flexible tag arrays.

**Decision:** Use MongoDB as the primary database with Prisma 6 as the ORM.

**Rationale:** MongoDB's document model naturally fits JSON workflow definitions and nested ticket conversations. Prisma provides type-safe queries, schema validation, and migration tooling while abstracting MongoDB-specific syntax.

**Consequences:** No relational joins — data denormalization is required in places. Prisma's MongoDB support has some limitations (no transactions on unsharded collections in older Atlas tiers).

---

## ADR-3: Feature-Based Module Structure

**Status:** Accepted

**Context:** As the application grew beyond basic CRUD (14 feature modules, 39 API routes), a flat file structure would become unmaintainable.

**Decision:** Organize code by feature domain with a consistent internal structure (`components/`, `services/`, `types/`, `utils/`).

**Rationale:** Co-locating related code reduces cognitive load when working on a feature. The consistent structure makes the codebase predictable — a developer knows where to find the service layer for any feature.

**Consequences:** Shared utilities must live outside `features/` in `lib/`. Cross-feature imports are allowed but should go through service interfaces rather than reaching into internal components.

---

## ADR-4: Provider Chain for AI Integration

**Status:** Accepted

**Context:** AI draft generation needs to work in development (without API keys) and production (with real providers), and should handle provider outages gracefully.

**Decision:** Implement an `AiDraftProvider` interface with a chain-of-responsibility pattern: OpenAI → Anthropic → mock fallback.

**Rationale:** The provider interface enables swapping implementations without changing business logic. The chain provides automatic failover. The mock provider enables full development workflow without API keys.

**Consequences:** All provider attempts are logged to `AiUsageLog`, adding database writes even on failure. The chain adds latency when primary providers fail (sequential fallback, not parallel).

---

## ADR-5: Signed JWT Sessions

**Status:** Accepted

**Context:** The initial prototype used Base64-encoded JSON cookies — trivially forgeable.

**Decision:** Use signed JWTs via `jose` (HS256, 24h expiry) stored in HttpOnly cookies.

**Rationale:** JWTs are stateless (no server-side session store needed), signed (tamper-proof), and widely understood. The `jose` library is lightweight and supports the Web Crypto API.

**Consequences:** No server-side session revocation without a blocklist. Token refresh requires re-authentication after 24h.

---

## ADR-6: SameSite=Strict Cookies

**Status:** Accepted

**Context:** CSRF protection is critical for a support tool that modifies ticket data.

**Decision:** Set session cookies to `SameSite=Strict` with the `Secure` flag in production.

**Rationale:** `SameSite=Strict` prevents the cookie from being sent on any cross-site request, eliminating CSRF. The `Secure` flag ensures HTTPS-only transmission.

**Consequences:** Navigating to the app from an external link (email, Slack) requires re-authentication. Acceptable for an internal support tool.

---

## ADR-7: Zod Validation on All API Routes

**Status:** Accepted

**Context:** API endpoints accept user input that must be validated before processing.

**Decision:** Use Zod schemas to validate all request bodies at the API layer.

**Rationale:** Zod provides runtime validation with TypeScript type inference. Defining schemas at the API boundary ensures no invalid data reaches the service layer. The `.safeParse()` pattern returns structured errors without throwing.

**Consequences:** Schemas must be maintained alongside TypeScript types. Minor duplication between Zod schemas and Prisma model types.

---

## ADR-8: Centralized API Client

**Status:** Accepted

**Context:** Client components were using scattered `fetch()` calls with inconsistent error handling.

**Decision:** Create a single `apiClient<T>()` function for all client-side API calls.

**Rationale:** Centralizes JSON serialization, Content-Type headers, and error extraction. Provides a single point for future enhancements (auth headers, retries, request logging). All API responses use the `{ data: ... }` wrapper, so callers destructure consistently.

**Consequences:** All client services depend on this function. Changes to error handling affect every API call.

---

## ADR-9: SSE for Real-Time Updates

**Status:** Accepted

**Context:** Ticket updates should appear in real-time without manual refresh.

**Decision:** Use Server-Sent Events (SSE) instead of WebSockets.

**Rationale:** SSE is simpler to implement (standard HTTP, no upgrade handshake), works through proxies and load balancers, and is sufficient for unidirectional server → client updates. A 30-second heartbeat prevents connection timeouts.

**Consequences:** No client → server streaming. For bidirectional communication (e.g., live chat), WebSockets would be needed.

---

## ADR-10: Three-Tier RBAC

**Status:** Accepted

**Context:** Different team members need different access levels — admins manage settings, supervisors monitor operations, agents handle tickets.

**Decision:** Implement three roles (admin, supervisor, agent) with 12 granular permissions.

**Rationale:** Granular permissions provide fine-grained control without the complexity of a full ACL system. Permissions are checked at both the API layer (middleware) and the UI layer (conditional rendering) for defense in depth.

**Consequences:** Adding a new role or permission requires updating the role-permission mapping in `role-service.ts` and testing the new access paths.

---

## ADR-11: Workflow Engine with JSON Rules

**Status:** Accepted

**Context:** Support teams need automated triage — routing tickets by subject, assigning to specialists, applying tags.

**Decision:** Store workflow rules as JSON trigger/action pairs, executed manually or automatically on ticket events.

**Rationale:** JSON rules are flexible (new operators and actions can be added without schema changes), inspectable (admins see exactly what the rule does), and testable (pure function matching). Loop prevention via execution context ensures rules don't trigger infinitely.

**Consequences:** Complex rule logic (AND/OR conditions) requires extending the trigger model. No scheduled or time-delayed actions.

---

## ADR-12: Dark Mode via CSS Class Strategy

**Status:** Accepted

**Context:** Users expect dark mode support, especially for tools used during extended support shifts.

**Decision:** Use Tailwind CSS `dark:` variant with a class-based toggle, persisted in localStorage and synced with system preferences.

**Rationale:** Class-based dark mode gives users explicit control while respecting system preferences as the default. Tailwind's `dark:` utilities keep light/dark styles co-located in the same component.

**Consequences:** Every component must include `dark:` variants for colors. The `ThemeProvider` component manages class toggling on the `<html>` element.

---

## ADR-13: Multi-Mailbox Email Architecture

**Status:** Accepted

**Context:** Support teams often manage multiple email addresses (support@, sales@, billing@). A single-mailbox design would force separate deployments per mailbox.

**Decision:** Make `EmailConfig` a multi-record model with per-mailbox SMTP/IMAP credentials, a unique `fromAddress`, and `isDefault`/`isActive` flags. Track `mailboxId` on `EmailLog` and `Ticket`.

**Rationale:**

- **Unique `fromAddress`** prevents duplicate mailboxes and enables routing inbound replies back to the originating mailbox.
- **`isDefault` flag** with automatic clearing (only one default at a time) ensures backward compatibility — existing code calling `getEmailConfig()` gets the default.
- **`Promise.allSettled()` polling** ensures one failing mailbox doesn't block others during IMAP polling.
- **`mailboxId` on EmailLog and Ticket** enables per-mailbox analytics, filtering, and audit trails.

**Consequences:** Password management becomes more complex (multiple sets of credentials). Future work: encrypted credential storage, connection pool reuse across poll cycles.

---

## ADR-14: CSAT Ratings on Closed Tickets

**Status:** Accepted

**Context:** Measuring customer satisfaction requires a lightweight feedback mechanism.

**Decision:** Add a CSAT widget (1–5 score + optional comment) that appears only on closed tickets, stored as a `CsatRating` with a unique constraint on `ticketId`.

**Rationale:** One rating per ticket keeps the model simple. Restricting to closed tickets ensures the rating reflects the complete support experience. The unique constraint prevents duplicate submissions.

**Consequences:** No mid-conversation satisfaction tracking. Ratings can't be updated after submission (by design — prevents score manipulation).

---

## ADR-15: Bulk Operations with Multi-Select

**Status:** Accepted

**Context:** Agents managing high-volume queues need to assign, re-prioritize, or close multiple tickets at once.

**Decision:** Add checkbox multi-select to the ticket list with bulk assign, status change, and priority change operations.

**Rationale:** Bulk operations use the same underlying service functions as single-ticket operations, ensuring consistent business logic (activity logging, workflow triggers). The UI shows selected count and available actions in a toolbar.

**Consequences:** Bulk operations are not atomic — individual failures are possible. The UI reports success/failure counts rather than all-or-nothing.
