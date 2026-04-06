# ChefPro

**Enterprise-grade daily tasting tracker and menu signage platform for large-scale food service operations.**

ChefPro digitizes the daily tasting workflow — from menu packet creation and chef assignments to live ratings, compliance tracking, and audit trails. Built for multi-location campuses where food quality, regulatory compliance, and operational visibility are critical.

## Key Features

- **Role-Based Access Control** — 6 distinct roles (FTE Ops, Executive Chef, Sous Chef, Kitchen Admin, FOH Manager, and more) with a 3-tier permission system: role defaults, subtype overrides, and per-user exceptions.
- **Daily Tasting Sessions** — Chefs submit dish-by-dish ratings (1–5 star scale), temperature compliance, photos, and adjustment notes against configurable tasting windows.
- **Menu Signage Packets** — Full lifecycle management: draft, publish, review signatures, amendments, and finalize for service — with category-level tracking (entrees, sides, pastry, backups).
- **Compliance & Audit** — Immutable, field-level audit trail on every mutation. Deadline rules enforce tasting windows per location and meal period.
- **Notifications** — In-app alerts with Web Push support; extensible to email and chat channels.
- **Daily Count Sheets** — Configurable templates per location/period with section-based data entry and amendment tracking.
- **Analytics Dashboard** — Recharts-powered visualizations for ops leadership.

## Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)                  |
| Language      | TypeScript 5, React 19                              |
| Database      | PostgreSQL with Prisma 7 ORM (`@prisma/adapter-pg`) |
| Auth          | NextAuth v5 (JWT strategy, Credentials provider)    |
| Validation    | Zod v4 (shared schemas for API + client)            |
| Data Fetching | SWR (client-side caching, optimistic updates)       |
| File Storage  | Supabase Storage (tasting photos)                   |
| UI            | Tailwind CSS v4, Radix UI primitives, Lucide icons  |
| Charts        | Recharts                                            |
| Testing       | Vitest (mock-based unit tests)                      |
| Code Quality  | ESLint, Prettier, Husky + lint-staged pre-commit    |

## Architecture

ChefPro is a **modular monolith** with strict module boundaries. Every request flows through three layers:

```
API Route  →  Service Function  →  Prisma / PostgreSQL
(auth, validation, error mapping)   (business logic, transactions, events)
```

### Domain Modules

| Module              | Responsibility                                                     |
| ------------------- | ------------------------------------------------------------------ |
| `identity-access`   | Users, roles, RBAC, 3-tier permissions, auth middleware            |
| `tasting-capture`   | Tasting sessions, items, ratings, photo upload                     |
| `menu-signage`      | Packet creation, review workflow, signatures, amendments           |
| `configuration`     | Campuses, buildings, locations, periods, deadlines, rating schemas |
| `daily-counts`      | Count sheet templates, daily entries, amendments                   |
| `review-compliance` | Status transitions, compliance summaries                           |
| `notifications`     | In-app + Web Push alerts, extensible to email/chat                 |
| `audit`             | Immutable field-level change log                                   |
| `media`             | File uploads via Supabase Storage                                  |
| `events`            | In-memory domain event bus for cross-module coordination           |

### Infrastructure Highlights

- **Domain Event Bus** — Services publish events after writes; subscribers handle side effects (audit logging, notifications) without tight coupling.
- **Centralized Error Handling** — Prisma errors map to HTTP status codes via `handleServiceError()` for consistent API responses.
- **JWT Auth with Live Permission Refresh** — Tokens store role + permissions; refreshed from DB on every token rotation.

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # REST endpoints (thin controllers)
│   ├── (auth)/           # Login page
│   ├── chef/             # Chef mobile-first UI
│   ├── ops/              # Ops admin dashboard
│   ├── menu-signage/     # Menu signage (multi-role)
│   └── daily-counts/     # Daily count sheets
├── modules/              # Domain logic (types + services + tests)
│   ├── identity-access/
│   ├── tasting-capture/
│   ├── menu-signage/
│   ├── configuration/
│   ├── daily-counts/
│   ├── review-compliance/
│   ├── notifications/
│   ├── audit/
│   ├── media/
│   └── events/
├── components/           # Shared + role-specific UI components
│   ├── ui/               # Base primitives (button, card, dialog)
│   ├── shared/           # AppShell, sidebar, theme, session
│   ├── chef/             # Chef-specific components
│   └── menu-signage/     # Signage-specific components
└── lib/                  # Cross-cutting infrastructure
    ├── db.ts             # Prisma client singleton
    ├── auth.ts           # NextAuth config
    ├── api-errors.ts     # Error → HTTP status mapper
    ├── validations.ts    # Zod schemas
    └── hooks/            # SWR wrappers (useApi, useMutation)

prisma/
├── schema.prisma         # Full data model (~570 lines, 25+ models)
├── migrations/           # Versioned migration history
└── seed.ts               # Demo data seeder
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (via [Postgres.app](https://postgresapp.com/) or any PG instance)

### Setup

```bash
npm install

cp .env.example .env
# Edit .env with your DATABASE_URL

npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### Demo Accounts

| Role                  | Email                        | Password   |
| --------------------- | ---------------------------- | ---------- |
| FTE Ops               | fte@chefpro.demo             | chefpro123 |
| FTE Chef              | fte.chef@chefpro.demo        | chefpro123 |
| Ops                   | ops@chefpro.demo             | chefpro123 |
| Assistant Ops         | assistant.ops@chefpro.demo   | chefpro123 |
| Executive Chef        | exec.chef@chefpro.demo       | chefpro123 |
| Chef (Sous)           | chef@chefpro.demo            | chefpro123 |
| Kitchen Admin Manager | kitchen.manager@chefpro.demo | chefpro123 |
| Kitchen Admin         | kitchen@chefpro.demo         | chefpro123 |
| FOH Manager           | foh@chefpro.demo             | chefpro123 |

## Scripts

| Command                       | Description                              |
| ----------------------------- | ---------------------------------------- |
| `npm run dev`                 | Start development server                 |
| `npm run build`               | Production build                         |
| `npm run lint`                | ESLint checks                            |
| `npm run typecheck`           | TypeScript type checks                   |
| `npm run test`                | Unit tests (Vitest)                      |
| `npm run format`              | Format with Prettier                     |
| `npm run db:generate`         | Regenerate Prisma client                 |
| `npm run db:migrate`          | Run Prisma migrations                    |
| `npm run db:seed`             | Seed demo data                           |
| `npm run job:check-deadlines` | Deadline enforcement (schedule via cron) |

## Star Rating Key

| Stars | Meaning              |
| ----- | -------------------- |
| 1     | Unservable           |
| 2     | Needs Adjustment     |
| 3     | Meets Standards      |
| 4     | Excellent / Elevated |
| 5     | Paragon              |

## License

This project is proprietary. All rights reserved.
