# Roadmap

## Completed

### Core Platform

- [x] Support inbox with search, filters, and highlighted matches
- [x] Ticket detail with full conversation thread
- [x] Status management (open → pending → resolved → closed)
- [x] Ticket assignment to team members
- [x] Internal notes (team-only messages)
- [x] Cursor-based pagination on ticket list
- [x] Centralized API client and feature service layers
- [x] Zod validation on all API routes
- [x] Seed data with realistic tickets (10), customers (6), and workflows (3)

### AI Integration

- [x] AI draft generation with provider chain (OpenAI → Anthropic → mock fallback)
- [x] Tone selection (professional, friendly, concise, empathetic)
- [x] Draft save, edit, and send as reply
- [x] AI usage logging dashboard
- [x] Ticket classification service (keyword + AI-powered)

### Workflow Automation

- [x] Rule builder with structured triggers (field + operator + value)
- [x] Actions: change-status, assign-ticket, generate-draft, add-tag
- [x] Manual and automatic workflow execution with loop prevention
- [x] Workflow admin (create, toggle, delete)
- [x] Activity logging (status changes, assignments, workflow runs)

### Authentication & Authorization

- [x] Signed JWT sessions with `jose` (HS256, 24h expiry)
- [x] RBAC with three roles: admin, supervisor, agent
- [x] 11 granular permissions enforced on all API routes
- [x] Hardened session cookies (HttpOnly, SameSite=Strict, Secure in production)
- [x] API auth middleware (`requireApiAuth`, `requireApiPermission`)

### Email Integration

- [x] Email threading fields on message model (externalMessageId, inReplyTo)
- [x] Inbound email webhook with HMAC signature verification
- [x] Outbound email via provider interface (console-log dev provider)
- [x] Reply-to-email sending pipeline

### Real-Time Updates

- [x] SSE endpoint for live ticket updates (30s heartbeat)
- [x] Client hook for auto-refresh on new messages
- [x] Notification model and service
- [x] Notification bell UI in header with unread count

### Ticket Enhancements

- [x] Tags model with ticket relation and tag picker UI
- [x] Tag filtering on ticket list
- [x] Saved replies model, CRUD, and composer insertion
- [x] SLA policy model with breach detection

### Analytics & Reporting

- [x] Analytics dashboard (ticket volume, resolution time, status/priority breakdown)
- [x] Chart components (bar chart, volume chart, stat cards)

### Audit & Compliance

- [x] Audit log viewer with type filtering and cursor pagination
- [x] Color-coded activity badges

### Production Readiness

- [x] Unit tests for role service, AI providers, workflow utils, API auth, API client
- [x] GitHub Actions CI pipeline (lint, type-check, test, build)
- [x] Dockerfile (multi-stage, non-root) and docker-compose (MongoDB + app)
- [x] Loading skeletons and error boundaries on all major routes
- [x] Database indexes for common query patterns
- [x] Security audit and hardening (cookie flags, input bounds, error handling)

## Future Improvements

- [ ] Rate limiting on API routes
- [ ] Server-side session revocation (blocklist)
- [ ] File attachments on tickets
- [ ] Multi-turn conversation context for AI draft generation
- [ ] Sentiment analysis badge on tickets
- [ ] Customer-facing portal
- [ ] Kubernetes deployment manifests
- [ ] End-to-end tests (Playwright)
