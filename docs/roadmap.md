# Roadmap

### Completed

#### Core Platform

- [x] Support inbox with search, filters, and highlighted matches
- [x] Ticket detail with full conversation thread
- [x] Status management (open → pending → resolved → closed)
- [x] Priority management (low, normal, high, urgent) with inline editing
- [x] Ticket assignment to team members
- [x] Internal notes with @mention autocomplete
- [x] Cursor-based pagination on ticket list
- [x] Tag picker with filtering on ticket list
- [x] Color-coded activity timeline by event type
- [x] Customer history sidebar on ticket detail
- [x] Bulk ticket operations (assign, status change, priority change)
- [x] Centralized API client and feature service layers
- [x] Zod validation on all API routes
- [x] Seed data with realistic tickets (10), customers (6), and workflows (3)

#### AI Integration

- [x] AI draft generation with provider chain (OpenAI → Anthropic → mock fallback)
- [x] Tone selection (professional, friendly, concise, empathetic)
- [x] Draft save, edit, and send as reply
- [x] AI usage logging dashboard
- [x] Ticket classification service (keyword + AI-powered)

#### Workflow Automation

- [x] Rule builder with structured triggers (field + operator + value)
- [x] Actions: change-status, assign-ticket, generate-draft, add-tag
- [x] Manual and automatic workflow execution with loop prevention
- [x] Workflow admin (create, toggle, delete)
- [x] Activity logging (status changes, assignments, workflow runs)

#### Authentication & Authorization

- [x] Signed JWT sessions with `jose` (HS256, 24h expiry)
- [x] RBAC with three roles: admin, supervisor, agent
- [x] 12 granular permissions enforced on all API routes
- [x] Hardened session cookies (HttpOnly, SameSite=Strict, Secure in production)
- [x] API auth middleware (`requireApiAuth`, `requireApiPermission`)

#### Email Integration

- [x] Multi-mailbox support with per-mailbox SMTP/IMAP credentials
- [x] Default mailbox selection with isDefault flag
- [x] Parallel IMAP polling of all active mailboxes via `pollAllInboxes()`
- [x] Single-mailbox polling via `pollInboxById()`
- [x] Inbound email processing with automatic ticket creation and threading
- [x] Outbound SMTP delivery with per-mailbox sender identity
- [x] Email delivery logs with mailbox tracking
- [x] Email template builder with variable placeholders and live preview
- [x] Mailbox management UI (list, create, edit, delete)

#### Admin & Management

- [x] User management (create, edit roles, delete)
- [x] SLA policy editor with inline editing
- [x] Customer directory with search and ticket counts
- [x] Email log viewer with status filter and pagination

#### Customer Experience

- [x] CSAT rating widget on closed tickets (1-5 score + optional comment)

#### Real-Time Updates

- [x] SSE endpoint for live ticket updates (30s heartbeat)
- [x] Client hook for auto-refresh on new messages
- [x] Notification model and service
- [x] Notification bell UI in header with unread count

#### Ticket Enhancements

- [x] Tags model with ticket relation and tag picker UI
- [x] Tag filtering on ticket list
- [x] Saved replies model, CRUD, and composer insertion
- [x] SLA policy model with breach detection
- [x] Priority filter on ticket search

#### Analytics & Reporting

- [x] Analytics dashboard (ticket volume, resolution time, status/priority breakdown)
- [x] Chart components (bar chart, volume chart, stat cards)

#### Audit & Compliance

- [x] Audit log viewer with type filtering and cursor pagination
- [x] Color-coded activity badges

#### UI & Accessibility

- [x] Dark mode with system-preference detection and manual toggle
- [x] Loading skeletons and error boundaries on all major routes
- [x] Empty states with contextual guidance
- [x] Toast notifications for user feedback

#### Production Readiness

- [x] Unit tests (42 tests across 7 files — roles, AI providers, auth, utilities)
- [x] GitHub Actions CI pipeline (lint, type-check, test, build)
- [x] Dockerfile (multi-stage, non-root) and docker-compose (MongoDB + app)
- [x] Database indexes for common query patterns
- [x] Security audit and hardening (cookie flags, input bounds, error handling)

### Future Improvements

- [ ] Rate limiting on API routes
- [ ] Server-side session revocation (blocklist)
- [ ] File attachments on tickets
- [ ] Multi-turn conversation context for AI draft generation
- [ ] Encrypted mailbox credentials (AES at rest)
- [ ] IMAP connection pooling across poll cycles
- [ ] Webhook integrations (Slack, Teams)
- [ ] Sentiment analysis badge on tickets
- [ ] Customer-facing self-service portal
- [ ] Kubernetes deployment manifests
- [ ] End-to-end tests (Playwright)
