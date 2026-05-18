# ChefPro

**Enterprise-grade food service operations platform for tastings, menu signage, daily counts, and AI-assisted compliance intelligence.**

ChefPro digitizes daily food-service operations: tasting workflows, menu packet execution, count sheets, closing verification, temperature-log ingestion, compliance tracking, and audit trails. Built for multi-location campuses where food quality, regulatory compliance, and operational visibility are critical.

## Key Features

- **Role-Based Access Control** — 6 distinct roles (FTE Ops, Executive Chef, Sous Chef, Kitchen Admin, FOH Manager, and more) with a 3-tier permission system: role defaults, subtype overrides, and per-user exceptions.
- **Daily Tasting Sessions** — Chefs submit dish-by-dish ratings (1–5 star scale), temperature compliance, photos, and adjustment notes against configurable tasting windows.
- **Menu Signage Packets** — Full lifecycle management: draft, publish, review signatures, amendments, and finalize for service — with category-level tracking (entrees, sides, pastry, backups).
- **Compliance & Audit** — Immutable, field-level audit trail on every mutation. Deadline rules enforce tasting windows per location and meal period.
- **Notifications** — In-app alerts with Web Push support; extensible to email and chat channels.
- **Daily Count Sheets** — Configurable templates per location/period with section-based data entry and amendment tracking.
- **AI-Assisted Closing Verification** — Staff upload closing photos for stations, line, walk-in, dish area, and storage; Gemini flags AI-assisted potential issues that need manager review.
- **Temperature Log Intelligence** — Image/PDF log uploads are parsed into structured entries, archived as generated PDFs, and evaluated against default hot/cold holding thresholds.
- **Ops AI Assistant** — Gemini-backed assistant answers scoped operational questions using tastings, menu packets, compliance audits, and location data.
- **Analytics Dashboard** — Recharts-powered visualizations for ops leadership.

## Tech Stack

| Layer         | Technology                                                     |
| ------------- | -------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)                             |
| Language      | TypeScript 5, React 19                                         |
| Database      | PostgreSQL with Prisma 7 ORM (`@prisma/adapter-pg`)            |
| Auth          | NextAuth v5 (JWT strategy, Credentials provider)               |
| Validation    | Zod v4 (shared schemas for API + client)                       |
| Data Fetching | SWR (client-side caching, optimistic updates)                  |
| File Storage  | Supabase Storage (public tasting photos, private audit assets) |
| AI            | Gemini API via `@google/genai`                                 |
| PDF           | `pdf-lib` generated operational archives                       |
| UI            | Tailwind CSS v4, Radix UI primitives, Lucide icons             |
| Charts        | Recharts                                                       |
| Testing       | Vitest (mock-based unit tests)                                 |
| Code Quality  | ESLint, Prettier, Husky + lint-staged pre-commit               |

## Architecture

ChefPro is a **modular monolith** with strict module boundaries. Every request flows through three layers:

```
API Route  →  Service Function  →  Prisma / PostgreSQL
(auth, validation, error mapping)   (business logic, transactions, events)
```

### Domain Modules

| Module                   | Responsibility                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| `identity-access`        | Users, roles, RBAC, 3-tier permissions, auth middleware            |
| `tasting-capture`        | Tasting sessions, items, ratings, photo upload                     |
| `menu-signage`           | Packet creation, review workflow, signatures, amendments           |
| `configuration`          | Campuses, buildings, locations, periods, deadlines, rating schemas |
| `daily-counts`           | Count sheet templates, daily entries, amendments                   |
| `ai-agents`              | Gemini chat, tool orchestration, sessions, insight reports         |
| `operational-compliance` | Closing photos, temperature logs, audit assets, AI-assisted issues |
| `review-compliance`      | Status transitions, compliance summaries                           |
| `notifications`          | In-app + Web Push alerts, extensible to email/chat                 |
| `audit`                  | Immutable field-level change log                                   |
| `media`                  | File uploads via Supabase Storage                                  |
| `events`                 | In-memory domain event bus for cross-module coordination           |

### Infrastructure Highlights

- **Domain Event Bus** — Services publish events after writes; subscribers handle side effects (audit logging, notifications) without tight coupling.
- **Centralized Error Handling** — Prisma errors map to HTTP status codes via `handleServiceError()` for consistent API responses.
- **JWT Auth with Live Permission Refresh** — Tokens store role + permissions; refreshed from DB on every token rotation.
- **Private Operational Audit Assets** — Closing photos, source logs, and generated archive PDFs are stored in a private Supabase bucket and served through short-lived signed URLs after app-level checks.
- **AI-Assisted Review Boundary** — AI findings are stored as potential issues that need manager review, not regulatory determinations.

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # REST endpoints (thin controllers)
│   ├── (auth)/           # Login page
│   ├── chef/             # Chef mobile-first UI
│   ├── ops/              # Ops admin dashboard
│   ├── compliance/       # Staff closing/temp-log uploads
│   ├── menu-signage/     # Menu signage (multi-role)
│   └── daily-counts/     # Daily count sheets
├── modules/              # Domain logic (types + services + tests)
│   ├── identity-access/
│   ├── tasting-capture/
│   ├── menu-signage/
│   ├── configuration/
│   ├── daily-counts/
│   ├── ai-agents/
│   ├── operational-compliance/
│   ├── review-compliance/
│   ├── notifications/
│   ├── audit/
│   ├── media/
│   └── events/
├── components/           # Shared + role-specific UI components
│   ├── ui/               # Base primitives (button, card, dialog)
│   ├── shared/           # AppShell, sidebar, theme, session
│   ├── chef/             # Chef-specific components
│   ├── ai/               # AI assistant components
│   └── menu-signage/     # Signage-specific components
└── lib/                  # Cross-cutting infrastructure
    ├── db.ts             # Prisma client singleton
    ├── auth.ts           # NextAuth config
    ├── api-errors.ts     # Error → HTTP status mapper
    ├── validations.ts    # Shared Zod schemas
    ├── gemini.ts         # Gemini client + structured output helpers
    ├── supabase.ts       # Supabase server client
    └── hooks/            # SWR wrappers (useApi, useMutation)

prisma/
├── schema.prisma         # Full data model
├── migrations/           # Versioned migration history
└── seed.ts               # Demo data seeder

supabase/
└── migrations/           # Supabase-specific SQL, including storage buckets
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL via `DATABASE_URL` (local or Supabase Postgres)
- Supabase project + service role key for file storage features
- Gemini API key for AI assistant and operational compliance analysis

### Setup

```bash
npm install

cp .env.example .env
# Edit .env with DATABASE_URL, AUTH_SECRET, Supabase storage vars, and Gemini key

npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Operational compliance requires:

| Variable                    | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL for Storage                          |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side storage access                                |
| `GEMINI_API_KEY`            | Preferred Gemini API key                                  |
| `GOOGLE_AI_API_KEY`         | Backward-compatible Gemini key fallback                   |
| `GEMINI_MODEL`              | Optional model override, default `gemini-3-flash-preview` |

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
