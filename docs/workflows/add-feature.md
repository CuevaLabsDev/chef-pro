# Workflow: Add a Feature End-to-End

Follow these steps in order when adding a new feature to ChefPro.
Do not skip steps. Each step references the pattern or module doc to follow.

## Pre-Work

- [ ] Read `docs/architecture.md` to understand where the feature fits.
- [ ] Identify which module owns this feature (see `docs/modules/`).
- [ ] Read that module's doc to understand its current exports, dependencies, and side effects.

## Step 1: Define Types

**File:** `src/modules/<module>/types.ts`

Add any new interfaces, input types, or enums the feature needs. Follow existing naming conventions in the file.

## Step 2: Add Service Function

**File:** `src/modules/<module>/service.ts`
**Pattern:** `docs/patterns/service-function.md`

- Import `prisma` from `@/lib/db`.
- Write the query/mutation logic.
- If multi-table write: use `prisma.$transaction()`.
- If state change: publish a domain event after commit (see Step 5).
- If mutation: include audit logging (see Step 6).
- Return typed results matching the types from Step 1.

## Step 3: Add Zod Schema

**File:** `src/lib/validations.ts`
**Pattern:** `docs/patterns/validation.md`

- Name the schema following conventions: `create<Entity>Schema`, `update<Entity>Schema`.
- Use `z.coerce.date()` for date fields.
- Use `.optional()` for omittable fields, `.nullable()` for explicitly-null fields.
- Reuse existing sub-schemas where possible.

## Step 4: Add API Route

**File:** `src/app/api/<resource>/route.ts`
**Pattern:** `docs/patterns/api-route.md`

- Start with `requireAuth()` or `requirePermission()`.
- Validate input with `safeParse`.
- Call the service function from Step 2.
- Add audit event (fire-and-forget) after successful writes.
- Wrap in try/catch with `handleServiceError`.

## Step 5: Add Domain Event (if needed)

**Workflow:** `docs/workflows/add-domain-event.md`

Only needed if the feature involves a meaningful state change that other modules should react to (e.g., notifications, audit trail via event subscriber).

## Step 6: Add Audit Logging

**Reference:** `docs/modules/audit.md`

Every create/update/delete must produce an audit event. Choose one approach:

- **Direct:** Call `createAuditEvent()` in the API route (fire-and-forget).
- **Via event subscriber:** If a domain event is published, add an audit subscriber.
- **Inside transaction:** For atomic flows, create the audit event in the `$transaction`.

## Step 7: Add Permission (if needed)

**Workflow:** `docs/workflows/add-permission.md`

If this feature requires a new permission key, follow the RBAC addition flow before wiring the route guard.

## Step 8: Add Tests

**Pattern:** `docs/patterns/testing.md`

- Create `src/modules/<module>/service.test.ts` (or add to existing).
- Mock `@/lib/db` and any cross-module imports.
- Test: correct Prisma calls, return values, error cases, event publishing.

## Step 9: Add UI (if needed)

- **Page:** `src/app/<role-section>/<page>/page.tsx`
- **Component:** `src/components/<role>/` or `src/components/shared/`
- **Data fetching:** Use `useApi` for reads, `useMutation` for writes (see `docs/patterns/client-data.md`).
- **Permission guard:** Layout files check permissions before rendering.

## Step 10: Verify

```bash
npm run lint
npm run typecheck
npm test
```

Fix any failures before considering the feature complete.
