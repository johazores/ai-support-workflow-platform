# Architecture

This project uses Next.js with App Router for page rendering and Pages Router API routes for backend endpoints.

## Structure

- `app/` handles page rendering.
- `pages/api/` handles API routes.
- `features/` contains product modules.
- `components/` contains shared UI components.
- `lib/` contains shared utilities and infrastructure code.
- `types/` contains shared TypeScript types.

## Rules

- Use kebab-case for files and folders.
- Keep components focused on UI.
- Keep business logic inside services.
- Keep API handlers thin.
- Avoid hardcoded product logic inside pages.
