# ChefPro - Daily Tasting Tracker

A modular, mobile-first web app for managing daily food tastings, menu signage, and compliance tracking. Built with Next.js, PostgreSQL, and Tailwind CSS.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (via [Postgres.app](https://postgresapp.com/) or any PG instance)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and configure your local PG connection
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate Prisma client
npm run db:generate

# Run initial migration
npm run db:migrate

# Seed default config (locations, periods, schema, demo users)
npm run db:seed

# Start dev server
npm run dev
```

### Demo Accounts

| Role                  | Email                        | Password   |
| --------------------- | ---------------------------- | ---------- |
| Chef (Sous)           | chef@chefpro.demo            | chefpro123 |
| Kitchen Admin         | kitchen@chefpro.demo         | chefpro123 |
| Kitchen Admin Manager | kitchen.manager@chefpro.demo | chefpro123 |
| FOH Manager           | foh@chefpro.demo             | chefpro123 |
| Ops                   | ops@chefpro.demo             | chefpro123 |
| FTE Ops               | fte@chefpro.demo             | chefpro123 |

## Architecture

ChefPro is a **modular monolith** with strict module boundaries:

- **IdentityAccess** - users, roles, RBAC with 3-tier permissions (role fallback -> subtype defaults -> per-user overrides)
- **MenuSignage** - menu signage packet creation, review workflow, signatures, amendments
- **Configuration** - campuses, buildings, locations, periods, deadlines, rating schemas
- **TastingCapture** - sessions, items, ratings, photos
- **ReviewCompliance** - status transitions, compliance summary
- **Media** - file upload/storage via Supabase Storage
- **Audit** - immutable field-level change log with transactional writes for compliance-critical mutations
- **Notifications** - in-app alerts + web push, extensible to email/chat
- **Events** - domain event bus for cross-module coordination

### Infrastructure

- **Database**: PostgreSQL (local via Postgres.app)
- **File Storage**: Supabase Storage (`tasting-photos` bucket) — optional for local dev
- **Auth**: NextAuth v5 with Credentials provider and JWT strategy
- **Data Fetching**: SWR for client-side caching and optimistic updates

## Scripts

| Command                       | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `npm run dev`                 | Start development server                    |
| `npm run build`               | Production build                            |
| `npm run lint`                | Run ESLint checks                           |
| `npm run typecheck`           | Run TypeScript checks                       |
| `npm run test`                | Run unit tests (Vitest)                     |
| `npm run test:ci`             | Run tests with verbose reporter             |
| `npm run format`              | Format project files (Prettier)             |
| `npm run format:check`        | Verify formatting without writing           |
| `npm run db:generate`         | Regenerate Prisma client                    |
| `npm run db:migrate`          | Run Prisma migrations                       |
| `npm run db:seed`             | Seed locations, periods, schema, demo users |
| `npm run job:check-deadlines` | Run deadline check (schedule via cron)      |

## Developer Workflow

Use this local loop for safe and fast iteration:

```bash
# 1) Make focused code changes
# 2) Run quality checks
npm run lint
npm run typecheck
npm run test
npm run format:check
```

Pre-commit hooks run `lint-staged` so staged files are linted, formatted, and related tests are run before commit.

## Agent-Friendly Conventions

- Repo-wide AI guidance lives in `.cursor/rules/*.mdc` and applies in all sessions.
- `AGENTS.md` documents the working agreement for commands and definition of done.
- Keep domain logic in `src/modules`, presentation concerns in `src/app`/`src/components`, and shared infrastructure in `src/lib`.
- API routes must use `handleServiceError` from `src/lib/api-errors.ts` for consistent error handling.
- New service functions require at least one happy-path and one error-path test.

## Star Rating Key

| Stars | Meaning              |
| ----- | -------------------- |
| 1     | Unservable           |
| 2     | Needs Adjustment     |
| 3     | Meets Standards      |
| 4     | Excellent / Elevated |
| 5     | Paragon              |

## Project Structure

```
src/
├── app/               # Next.js pages and API routes
│   ├── (auth)/        # Login
│   ├── chef/          # Chef mobile-first UI routes
│   ├── ops/           # Ops admin dashboard routes
│   ├── menu-signage/  # Menu signage pages (multi-role)
│   └── api/           # REST endpoints
├── modules/           # Domain modules (types + services)
├── components/        # Shared UI components
└── lib/               # Database, auth, validation, hooks
scripts/               # CLI tools (deadline checker)
prisma/                # Schema, migrations, and seed
```
