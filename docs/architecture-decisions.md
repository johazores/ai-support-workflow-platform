# Architecture Decisions

## 1. Use App Router for pages

The project uses the Next.js App Router for page rendering to keep UI modern and simple.

## 2. Use Pages Router for API routes

API endpoints live in `pages/api` for clarity and separation.

## 3. Do not use src

The project avoids a src folder to keep structure simple.

## 4. Use kebab-case

Files and folders use kebab-case.

Examples:

- ticket-service.ts
- workflow-service.ts
- ai-draft-panel.tsx

## 5. Use feature-based folders

Features are grouped like:

- features/tickets
- features/ai-drafts
- features/workflows

## 6. Keep API handlers thin

API routes should only:

1. Validate request
2. Call a service
3. Return response

## 7. Keep AI provider flexible

AI logic should support switching providers (OpenAI, Claude, Gemini).

## 8. Use MongoDB with Prisma

MongoDB for flexible data  
Prisma for type safety

## 9. Track activity logs

Important actions are logged:

- Status changes
- Assignment
- Workflow execution
- Draft generation
