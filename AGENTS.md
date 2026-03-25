# ChefPro Agent Playbook

## Repo Map

- `src/app`: Next.js routes, pages, and API handlers
- `src/modules`: domain modules and business services
- `src/lib`: shared infra (db, auth, validation, hooks, utilities)
- `prisma`: schema, migrations, and seed scripts
- `scripts`: operational scripts (deadline checks)

## Fast Commands

- `npm run dev`: local app
- `npm run lint`: lint all files
- `npm run typecheck`: strict TypeScript validation
- `npm run test`: run unit tests
- `npm run test:ci`: run tests with verbose reporter
- `npm run format:check`: enforce formatting
- `npm run db:migrate`: run Prisma migrations
- `npm run db:generate`: regenerate Prisma client

## Definition of Done

- Implement the smallest change that satisfies the request.
- Keep domain logic in `src/modules`; avoid placing it in page components.
- Validate with `npm run lint`, `npm run typecheck`, and `npm run test`.
- Update docs or examples if scripts, workflows, or conventions changed.

## API Route Conventions

- Wrap all service calls in try/catch using `handleServiceError` from `src/lib/api-errors.ts`.
- Return `{ error: string }` shape for all error responses.
- Emit audit events via `createAuditEvent()` after successful config mutations.
- Every model with a collection route needs a corresponding `[id]` route.

## Testing Requirements

- New service functions must have at least one happy-path and one error-path test.
- Tests mock Prisma via `vi.mock("@/lib/db")`.
- Pre-commit hooks run `vitest related --run` for changed files.

## Guardrail Notes

- Never commit real credentials; keep `.env.example` current.
- For Prisma changes: use `prisma migrate dev` (not `db push`), regenerate client, and verify impacted flows.
- Use Supabase Storage for file uploads, never local filesystem.
- Compliance-critical mutations must include audit writes in the same Prisma transaction.
- For risky changes, split into incremental commits for easier rollback.
