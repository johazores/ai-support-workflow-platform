# Roadmap

## Completed

- [x] Support inbox with search, filters, and highlighted matches
- [x] Ticket detail with full conversation thread
- [x] Status management (open → pending → resolved → closed)
- [x] Ticket assignment
- [x] Internal notes (team-only)
- [x] AI draft generation with provider interface (mock + OpenAI)
- [x] Draft save, edit, and send as reply
- [x] Workflow rule builder (triggers + actions)
- [x] Manual and automatic workflow execution
- [x] Workflow admin (create, toggle, delete)
- [x] Activity logging (status changes, assignments, workflow runs)
- [x] AI usage logging dashboard
- [x] Authentication with signed JWT sessions
- [x] Role-based access (admin vs. support)
- [x] Centralized API client and feature service layers
- [x] Zod validation on all API routes
- [x] Seed data with realistic tickets and customers

## In Progress

### Email Integration (Track A)
- [ ] Add email threading fields to message model
- [ ] Inbound email webhook with HMAC signature verification
- [ ] Outbound email via provider interface (console-log dev provider)
- [ ] Wire replies to email sending pipeline

### Real-Time Updates (Track B)
- [ ] SSE endpoint for live ticket updates
- [ ] Client hook for auto-refresh on new messages
- [ ] Notification model and service
- [ ] Notification bell UI in header with unread count

### Ticket Management (Track C)
- [ ] Tags model with ticket many-to-many relation
- [ ] Tag CRUD API and picker UI
- [ ] Tag filtering on ticket list
- [ ] Workflow action for auto-tagging
- [ ] Saved replies model and CRUD
- [ ] Saved reply insertion in reply composer
- [ ] Cursor-based pagination on ticket list
- [ ] SLA timer model with countdown display

## Planned

### AI Enhancements
- [ ] Multi-turn conversation context for draft generation
- [ ] Sentiment analysis badge on tickets
- [ ] AI confidence score display

### Analytics & Reporting
- [ ] Dashboard with resolution time, ticket volume, agent performance metrics
- [ ] Chart components for key metrics

### Production Readiness
- [ ] Expanded test coverage (service + API route integration tests)
- [ ] CI pipeline (GitHub Actions: lint, type-check, test)
- [ ] Dockerfile and docker-compose for local development
- [ ] Rate limiting on API routes
- [ ] RBAC middleware for granular permissions
