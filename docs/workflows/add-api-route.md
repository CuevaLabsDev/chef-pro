# Workflow: Add an API Route

Follow this checklist when creating a new API endpoint.

## Step 1: Determine File Location

| URL pattern               | File                                       |
| ------------------------- | ------------------------------------------ |
| `/api/<resource>`         | `src/app/api/<resource>/route.ts`          |
| `/api/<resource>/:id`     | `src/app/api/<resource>/[id]/route.ts`     |
| `/api/<parent>/:id/<sub>` | `src/app/api/<parent>/[id]/<sub>/route.ts` |

Create the directory structure if it doesn't exist.

## Step 2: Determine Required Permission

Check `docs/modules/identity-access.md` for the permission key list. Choose the most appropriate key for this endpoint. If no existing key fits, follow `docs/workflows/add-permission.md` first.

## Step 3: Write the Route Handler

Follow the template in `docs/patterns/api-route.md` exactly:

- [ ] Import `requireAuth` (or `requirePermission`) from `@/modules/identity-access/middleware`
- [ ] Import `hasPermission` from `@/modules/identity-access/service` (if fine-grained check needed)
- [ ] Import the relevant Zod schema from `@/lib/validations`
- [ ] Import the service function from `@/modules/<module>/service`
- [ ] Import `handleServiceError` from `@/lib/api-errors`
- [ ] Import `createAuditEvent` from `@/modules/audit/service` (if write operation)

## Step 4: Implement Each HTTP Method

For each method (GET, POST, PATCH, DELETE):

- [ ] Start with auth guard: `const { error, user } = await requireAuth()`
- [ ] Guard: `if (error || !user) return error!`
- [ ] Permission check: `if (!hasPermission(user, "key")) return 403`
- [ ] For writes: parse body with `safeParse`, return 400 on failure
- [ ] Call service function (never write Prisma queries here)
- [ ] For writes: fire-and-forget `createAuditEvent(...).catch(() => {})`
- [ ] Wrap service call in try/catch, return `handleServiceError(err)`

## Step 5: Add Zod Schema (if new)

If the endpoint accepts a request body that doesn't have an existing schema:

- [ ] Add schema to `src/lib/validations.ts`
- [ ] Follow naming: `create<Entity>Schema`, `update<Entity>Schema`
- [ ] See `docs/patterns/validation.md`

## Step 6: Ensure Service Function Exists

If the service function doesn't exist yet:

- [ ] Add it to `src/modules/<module>/service.ts`
- [ ] Follow `docs/patterns/service-function.md`
- [ ] Add types to `src/modules/<module>/types.ts`

## Step 7: Verify

```bash
npm run lint
npm run typecheck
npm test
```

## Common Mistakes to Avoid

- Writing Prisma queries directly in the route handler.
- Using `parse` instead of `safeParse` (causes unhandled exceptions).
- Forgetting the auth guard on any method.
- Forgetting to await `params` on dynamic route segments.
- Returning raw Prisma errors to the client (use `handleServiceError`).
- Skipping the audit event on write operations.
