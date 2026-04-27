# AI Support Workflow Platform

A portfolio-grade support inbox and workflow automation platform built with Next.js, TypeScript, MongoDB, Prisma, and AI-ready service layers.

## Purpose

This project demonstrates how to build a clean, maintainable, product-style support system with:

- Ticket management
- Customer context
- AI draft replies
- Workflow automation
- Activity logs
- Admin workflow management
- App Router pages
- Pages Router API routes

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- MongoDB
- Prisma
- Zod

## Architecture

This project intentionally uses:

- `app/` for page rendering
- `pages/api/` for API routes
- `features/` for product modules
- `components/` for shared UI
- `lib/` for infrastructure and utilities
- `prisma/` for database schema and seed data
- `docs/` for technical documentation

## Key Features

### Support Inbox

- View support tickets
- Search tickets
- Filter by status
- Open ticket detail page
- View conversation messages
- View customer context

### AI Drafts

- Generate suggested replies
- Edit generated drafts
- Save drafts to the ticket
- Display saved drafts in ticket history

### Workflow Automation

- Run workflow rules manually
- Auto-run workflows on status and assignment changes
- Structured workflow triggers
- Validated workflow actions
- Duplicate execution protection
- Activity log tracking

### Admin Workflows

- View workflow rules
- Create workflow rules
- Enable or disable workflows
- Delete workflow rules

## Getting Started

```bash
npm install
```
