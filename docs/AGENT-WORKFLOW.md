# Agent Workflow

Step-by-step guide for AI agents working in the ChefPro codebase. Follow this before, during, and after every change.

## Before Coding

1. **Read the relevant docs**. If you're touching domain logic, read `docs/ARCHITECTURE.md`. If you're working with types or APIs, read `docs/DATA-CONTRACTS.md`. If you're building UI, read `docs/UI-SYSTEM.md`.
2. **Check `.cursor/rules/`**. Three always-applied rules govern every session: `core-dev-workflow.mdc`, `module-boundaries.mdc`, `prisma-data-safety.mdc`.
3. **Identify the owning module**. Every feature belongs to one of the 10 modules under `src/modules/`. Find it before writing code.

## Discovery Checklist

Before implementing a feature, answer these questions:

| Question                             | Where to look                                      |
| ------------------------------------ | -------------------------------------------------- |
| Which module owns this feature?      | `src/modules/` — match by domain area              |
| What types already exist?            | `modules/<module>/types.ts`                        |
| What Zod schemas validate this data? | `src/lib/validations.ts`                           |
| What API routes serve this feature?  | `src/app/api/` — match by resource name            |
| What permissions gate access?        | `modules/identity-access/rbac-config.ts`           |
| What domain events are involved?     | `modules/events/types.ts`, `subscriptions.ts`      |
| What Prisma models store the data?   | `prisma/schema.prisma`                             |
| What UI components are available?    | `src/components/ui/` (shadcn), `docs/UI-SYSTEM.md` |

## Change Protocol

### Adding domain logic

1. Define or extend types in `modules/<module>/types.ts`.
2. Implement the logic in `modules/<module>/service.ts`.
3. If cross-module coordination is needed, publish a domain event via `eventBus.publish()` — never import another module's service directly.

### Adding validation

1. Add or extend a Zod schema in `src/lib/validations.ts`.
2. Use `.safeParse()` in the API route handler. Return 400 on failure.

### Adding an API route

1. Create `src/app/api/<resource>/route.ts`.
2. Use `requireAuth()` or `requirePermission()` from `modules/identity-access/middleware.ts`.
3. Validate request body with Zod.
4. Delegate to the module service.
5. Return the result as JSON.
6. If the route publishes domain events, call `ensureSubscriptions()` at module scope.

### Adding UI

1. Check `src/components/ui/` for existing shadcn/ui primitives.
2. Build page-level UI in `src/app/<portal>/<feature>/page.tsx`.
3. Extract reusable components to `src/components/<portal>/` or `src/components/ui/`.
4. Use `cn()` from `@/lib/utils` for conditional class merging.
5. Follow responsive patterns from `docs/UI-SYSTEM.md`.

### Changing the database schema

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma db push` (development) or `npx prisma migrate dev` (migration).
3. Run `npx prisma generate` to regenerate the client.
4. Prefer additive changes (new fields with defaults, new optional relations). Avoid destructive removals.
5. Update `docs/DATA-CONTRACTS.md` if models, fields, or relationships change.

## Definition of Done

Every change must satisfy all of these before it's considered complete:

- [ ] `npm run lint` passes with no new errors
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] No module boundary violations (domain logic in modules, not pages; no cross-module imports)
- [ ] Thin route handlers (validate → delegate → respond)
- [ ] `docs/DATA-CONTRACTS.md` updated if any contracts changed (Prisma models, Zod schemas, API shapes, module types)
- [ ] `docs/ARCHITECTURE.md` updated if new modules or structural changes
- [ ] `docs/UI-SYSTEM.md` updated if new components or layout patterns

## Common Pitfalls

### Business logic in page components

Pages are presentation. They call `fetch()` to API routes or render server-fetched data. Domain rules (state machines, calculations, access control) belong in module `service.ts` files.

### Cross-module imports

Modules must not import from each other. If module A needs to react to something in module B, use the event bus. The only exceptions are: modules importing shared infrastructure from `src/lib/`, and `events/subscriptions.ts` which wires cross-module event handlers.

### Forgetting to regenerate Prisma client

After any change to `prisma/schema.prisma`, run `npx prisma generate`. The TypeScript types won't update until you do.

### Hardcoded secrets

Never commit credentials, API keys, or real passwords. Use environment variables via `.env` (which is `.gitignore`d).

### Forgetting `ensureSubscriptions()`

Any API route that causes a domain event to be published must call `ensureSubscriptions()` at module scope to ensure handlers are registered. Check existing routes for the pattern.

### Bypassing Zod validation

All user-provided data must go through a Zod schema before reaching service functions. Never pass raw `req.json()` directly to a service.

## Quick Commands

| Task                | Command                       |
| ------------------- | ----------------------------- |
| Start dev server    | `npm run dev`                 |
| Lint                | `npm run lint`                |
| Type check          | `npm run typecheck`           |
| Run tests           | `npm run test`                |
| Format check        | `npm run format:check`        |
| Format fix          | `npm run format`              |
| Regenerate Prisma   | `npm run db:generate`         |
| Push schema changes | `npm run db:push`             |
| Run migrations      | `npm run db:migrate`          |
| Seed database       | `npm run db:seed`             |
| Check deadlines     | `npm run job:check-deadlines` |
