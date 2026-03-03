# ChefPro - Daily Tasting Tracker

A modular, mobile-first web app that replaces the shared spreadsheet tasting tracker. Built with Next.js, PostgreSQL (via Prisma), and Tailwind CSS.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and set your DATABASE_URL
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed default config (locations, periods, schema, demo users)
npm run db:seed

# Start dev server
npm run dev
```

### Demo Accounts

| Role          | Email                | Password   |
| ------------- | -------------------- | ---------- |
| Chef (Sous)   | chef@chefpro.demo    | chefpro123 |
| Kitchen Admin | kitchen@chefpro.demo | chefpro123 |
| FOH Manager   | foh@chefpro.demo     | chefpro123 |
| Ops           | ops@chefpro.demo     | chefpro123 |
| FTE Ops       | fte@chefpro.demo     | chefpro123 |

## Architecture

ChefPro is a **modular monolith** with strict module boundaries:

- **IdentityAccess** - users, roles, RBAC
- **MenuSignage** - menu signage packet creation, execution, and backup readiness
- **Configuration** - locations, periods, deadlines, rating schemas
- **TastingCapture** - sessions, items, ratings, photos
- **ReviewCompliance** - status transitions, compliance summary
- **Media** - file upload/storage
- **Audit** - immutable field-level change log
- **Notifications** - in-app alerts, extensible to email/chat
- **Reporting** - CSV export, compliance summaries
- **Permissions** - subtype defaults and per-user overrides managed by FTE
- **Events** - domain event bus for cross-module coordination

## Scripts

| Command                       | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `npm run dev`                 | Start development server                      |
| `npm run build`               | Production build                              |
| `npm run lint`                | Run ESLint checks                             |
| `npm run typecheck`           | Run TypeScript checks                         |
| `npm run test`                | Run unit tests (Vitest)                       |
| `npm run format`              | Format project files (Prettier)               |
| `npm run format:check`        | Verify formatting without writing             |
| `npm run db:generate`         | Regenerate Prisma client                      |
| `npm run db:push`             | Push schema to database                       |
| `npm run db:seed`             | Seed locations, periods, schema, demo users   |
| `npm run import:spreadsheet`  | Import historical data from the Excel tracker |
| `npm run job:check-deadlines` | Run deadline check (schedule via cron)        |

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

Pre-commit hooks run `lint-staged` so staged files are linted/formatted before commit.

## Agent-Friendly Conventions

- Repo-wide AI guidance lives in `.cursor/rules/*.mdc` and applies in all sessions.
- `AGENTS.md` documents the working agreement for commands and definition of done.
- Keep domain logic in `src/modules`, presentation concerns in `src/app`/`src/components`, and shared infrastructure in `src/lib`.

## Star Rating Key (from workbook)

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
│   └── api/           # REST endpoints
├── modules/           # Domain modules (types + services)
├── components/        # Shared UI components
└── lib/               # Database, auth, validation utilities
scripts/               # CLI tools (importer, deadline checker)
prisma/                # Schema and seed
```
