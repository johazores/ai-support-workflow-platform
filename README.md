# AI Support Workflow Platform

A modern support inbox system with AI-powered replies and workflow automation.

---

## Features

### Core Inbox

- Ticket list with search and filters
- Ticket detail view with full conversation
- Customer context (name, email)
- Status management (open, pending, closed)
- Ticket assignment

### Replies

- AI-generated draft replies (OpenAI or mock)
- Manual reply composer
- Send saved draft as reply
- Internal notes (private team notes)

### Workflow Automation

- Create automation rules
- Structured triggers (subject, priority, status)
- Actions:
  - Change status
  - Assign ticket
  - Generate AI draft
- Manual and automatic execution
- Execution logs

### AI System

- Provider-based architecture
- OpenAI integration
- Fallback handling
- Usage logging dashboard

### Admin

- Workflow management
- AI usage logs dashboard
- Role-based access (admin vs support)

### Authentication

- Custom session-based auth
- Login / logout
- Protected routes

### Search

- Search by:
  - Ticket subject
  - Customer name
  - Customer email
  - Message content
- Highlighted search matches

### Testing

- Unit tests using Vitest
- Workflow engine test coverage

---

## Tech Stack

- Next.js (App Router + Pages API)
- TypeScript
- MongoDB
- Prisma ORM
- Tailwind CSS
- Vitest

---

## Project Structure

```txt
features/
  tickets/
  workflows/
  ai-drafts/
  auth/
components/
pages/api/
app/
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment

Create `.env`:

```env
DATABASE_URL="your_mongodb_url"
AI_PROVIDER="mock"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

### 3. Setup database

```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 4. Run app

```bash
npm run dev
```

Visit:

```txt
http://localhost:3000/login
```

Default login:

```txt
admin@example.com
admin123
```

---

## Testing

Run tests:

```bash
npm run test
```

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
