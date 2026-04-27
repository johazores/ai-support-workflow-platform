# Roadmap

This document tracks the planned direction for the AI Support Workflow Platform.

## Current Status

The project currently has:

- Support inbox
- Ticket detail page
- Customer context
- AI draft generation
- Draft saving
- Ticket status updates
- Ticket assignment
- Activity logs
- Manual workflow execution
- Automatic workflow execution
- Workflow admin page
- Create workflow rule
- Enable / disable workflow rule
- Delete workflow rule
- Structured workflow triggers
- Workflow action validation

## Next Priority Features

### 1. Authentication

Add authentication so admin and inbox pages are protected.

Recommended approach:

- Start with simple custom auth
- Later optionally replace with Clerk or NextAuth

Expected work:

- Add user model
- Add password hashing
- Add login API
- Add session handling
- Protect admin and inbox pages

### 2. Role-Based Access

Add user roles.

Roles:

- admin
- support
- viewer

### 3. Real AI Provider Integration

Replace mock AI draft generation with real provider support.

Potential providers:

- OpenAI
- Claude
- Gemini

Goal:

- Keep AI logic provider-neutral
- Allow switching providers through environment variables

### 4. Ticket Reply Sending

Add ability to send saved drafts as replies.

Expected work:

- Add reply API
- Convert draft into message
- Mark draft as sent
- Add activity log

### 5. Workflow Builder Improvements

Improve workflow creation UI.

Planned improvements:

- Add multiple actions per workflow
- Add action rows dynamically
- Add better field/operator/value controls
- Show readable trigger preview
- Show readable actions preview

### 6. Testing

Add test coverage.

Recommended:

- Vitest for services
- Playwright for main user flows

Important tests:

- Create workflow
- Run workflow
- Generate AI draft
- Save draft
- Update ticket status
- Assign ticket
- Search tickets

### 7. Deployment

Prepare app for deployment.

Expected work:

- Add deployment guide
- Add production environment docs
- Add MongoDB Atlas setup notes
- Add Vercel deployment notes
