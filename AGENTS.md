# ChefPro Agent Playbook

## Repo Map

- `src/app`: Next.js routes, pages, and API handlers
- `src/modules`: domain modules and business services
- `src/lib`: shared infra (db, auth, validation, utilities)
- `prisma`: schema and seed scripts
- `scripts`: operational scripts (imports, deadline checks)

## Fast Commands

- `npm run dev`: local app
- `npm run lint`: lint all files
- `npm run typecheck`: strict TypeScript validation
- `npm run test`: run baseline unit tests
- `npm run format:check`: enforce formatting

## Definition of Done

- Implement the smallest change that satisfies the request.
- Keep domain logic in `src/modules`; avoid placing it in page components.
- Validate with `npm run lint`, `npm run typecheck`, and `npm run test`.
- Update docs or examples if scripts, workflows, or conventions changed.

## Guardrail Notes

- Never commit real credentials; keep `.env.example` current.
- For Prisma changes: regenerate client and verify impacted flows.
- For risky changes, split into incremental commits for easier rollback.
