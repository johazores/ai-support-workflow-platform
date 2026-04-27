# Case Study: AI Support Workflow Platform

## Problem

Support teams often deal with repetitive customer requests, manual triage, inconsistent assignment, and repeated reply drafting.

This project explores how a support inbox can combine structured workflows with AI-assisted draft replies to reduce manual work.

## Solution

The platform provides a ticket inbox, customer context, AI draft generation, and workflow automation rules that can be executed manually or automatically.

## Engineering Decisions

### App Router for pages

The UI uses the Next.js App Router to keep page rendering modern and clean.

### Pages Router for API routes

API endpoints use `pages/api` to keep backend route handlers familiar, explicit, and easy to test.

### Feature-based architecture

Product areas are grouped by feature:

```txt
features/tickets
features/ai-drafts
features/workflows
```
