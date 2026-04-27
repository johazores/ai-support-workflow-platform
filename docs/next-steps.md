# Next Steps

Use this checklist to continue the project.

## Immediate Next Steps

### 1. Clean up current code

- Run `npm run build`
- Fix TypeScript errors
- Fix ESLint errors
- Remove unused imports
- Make sure all routes load correctly

### 2. Improve workflow admin UI

- Show trigger in readable format
- Show actions in readable format
- Improve create workflow form layout
- Add empty states
- Add success and error messages

### 3. Add authentication

Start with simple custom auth.

Recommended commits:

- feat: add user model
- feat: seed admin user
- feat: add password hashing utilities
- feat: add login api
- feat: add login page
- feat: protect admin routes
- feat: protect inbox routes

### 4. Add real AI provider support

Recommended commits:

- refactor: add ai provider interface
- feat: add mock ai draft provider
- feat: add openai draft provider
- feat: select ai provider from environment
- docs: document ai provider setup

### 5. Add tests

Recommended commits:

- chore: configure vitest
- test: add workflow trigger evaluator tests
- test: add workflow action validation tests
- test: add ticket service tests
- chore: configure playwright
- test: add inbox workflow e2e test

### 6. Polish portfolio presentation

Recommended commits:

- docs: add architecture diagram
- docs: add screenshots section
- docs: add technical tradeoffs
- docs: add future improvements
