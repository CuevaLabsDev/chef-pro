# Architecture

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Runtime:** React 19, Node.js
- **Database:** PostgreSQL via `DATABASE_URL` (local or Supabase Postgres)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` driver adapter
- **Auth:** NextAuth v5 (JWT strategy, credentials provider)
- **Validation:** Zod v4
- **Client data:** SWR
- **Storage:** Supabase Storage (`tasting-photos`, `operational-audit-assets`)
- **AI:** Gemini API via `@google/genai`
- **PDF:** `pdf-lib` for generated operational archives
- **UI:** Tailwind CSS v4, Radix primitives, Recharts
- **Testing:** Vitest (mock-based unit tests)

## Module Map

```
src/
  app/                           -- Next.js App Router (pages + API routes)
    api/                         -- API route handlers (thin controllers)
    (auth)/                      -- Auth pages (login)
	    chef/                        -- Chef-role pages
	    ops/                         -- Ops-role pages
	    compliance/                  -- Staff compliance upload page
	    menu-signage/                -- Menu signage pages (multi-role)
	    daily-counts/                -- Daily count sheet pages

  modules/                       -- Domain logic (the core of the app)
    identity-access/             -- Users, RBAC, permissions, auth middleware
    tasting-capture/             -- Tasting session CRUD, submit flow
    review-compliance/           -- Review workflow, status transitions
	    configuration/               -- Campuses, buildings, locations, periods, deadlines, schemas
	    menu-signage/                -- Menu signage packets, items, amendments
	    daily-counts/                -- Count sheet templates, entries, amendments
	    ai-agents/                   -- Gemini chat, tools, sessions, insight reports
	    operational-compliance/      -- Closing photos, temperature logs, operational audits
	    notifications/               -- In-app and external notifications
	    audit/                       -- Audit trail
	    media/                       -- File uploads (Supabase Storage)
    events/                      -- In-memory domain event bus

  lib/                           -- Cross-cutting infrastructure
    db.ts                        -- Prisma client singleton (pg adapter)
    auth.ts                      -- NextAuth configuration
    auth-types.ts                -- NextAuth type augmentation
	    supabase.ts                  -- Supabase client (storage only)
	    gemini.ts                    -- Gemini client, structured output, file parts
	    api-errors.ts                -- Prisma error -> HTTP status mapper
    validations.ts               -- All Zod schemas
    utils.ts                     -- cn(), formatDate(), statusColor(), etc.
    hooks/use-fetch.ts           -- SWR wrapper (useApi)
    hooks/use-mutation.ts        -- Mutation helper (useMutation)

  components/                    -- UI components
    ui/                          -- Base primitives (button, card, dialog, etc.)
	    shared/                      -- AppShell, AppSidebar, theme, session provider
	    ai/                          -- AI assistant panel components
	    chef/                        -- Chef-specific components
	    menu-signage/                -- Menu signage components
```

## Layering Rules

Every request flows through exactly three layers:

```
API Route (src/app/api/...)
  │  Thin controller: auth guard, Zod validation, error mapping
  ▼
Service Function (src/modules/*/service.ts)
  │  All business logic lives here: queries, transactions, event publishing
  ▼
Prisma Client (src/lib/db.ts)
  │  Database access only; no business logic
  ▼
PostgreSQL
```

### What belongs where

| Layer            | Belongs here                                          | Never put here                                  |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------- |
| API route        | Auth guard, Zod parse, service call, HTTP response    | Prisma queries, business rules                  |
| Service function | Prisma queries, transactions, event publishing, audit | HTTP concepts (Request, Response, status codes) |
| Prisma / lib     | Connection management, error mapping                  | Business logic, auth checks                     |
| Components       | UI rendering, client hooks                            | Direct API calls (use hooks), DB access         |

### Import Rules

```
app/api/**     → can import from: modules/*, lib/*
app/(pages)/** → can import from: components/*, lib/hooks/*
components/**  → can import from: lib/hooks/*, lib/utils
modules/*      → can import from: lib/db, lib/* utilities, and identity-access helpers where needed for permission checks
lib/*          → standalone; no imports from modules/ or app/
```

Circular imports between module folders are forbidden. Prefer event subscribers for cross-module side effects.

## Cross-Cutting Concerns

### Audit Trail

After any create/update/delete operation, services call `createAuditEvent()` from `modules/audit/service.ts`. The audit event captures: entity type, entity ID, action, actor, and optionally changed field values.

Audit events are fire-and-forget (`.catch(() => {})`) to avoid blocking the main operation.

Some modules own specialized audit records instead of generic `AuditEvent` rows. Operational compliance currently stores `OperationalAudit`, `OperationalAuditAsset`, and `ComplianceIssue` records as its audit trail and does not emit generic `AuditEvent` rows.

### Domain Events

The in-memory event bus (`modules/events/bus.ts`) decouples services from side effects. The pattern is:

1. Service completes the primary database write
2. Service calls `eventBus.publish(...)` after the write (not inside the transaction)
3. Subscribers in `events/subscriptions.ts` handle side effects (audit logging, notifications)

See `modules/events.md` for event types and subscriber contracts.

### Notifications

`modules/notifications/service.ts` creates notification records. In-app notifications are immediately marked "sent". Other channels (email, Google Chat) remain "pending" for future processing.

### AI And Operational Intelligence

`lib/gemini.ts` owns Gemini client creation, model fallback, inline/file parts, and structured JSON output with Zod validation and one repair pass. AI chat tools are user-scoped through `ToolContext`, and operational compliance uses Gemini for AI-assisted closing-photo review and temperature-log extraction.

### Storage

The `media` module owns public tasting-photo uploads in `tasting-photos`. Operational compliance owns private audit assets in `operational-audit-assets`; server code uses the Supabase service role key and returns short-lived signed URLs after app-level auth/location checks. Do not describe this as Supabase RLS enforcement.

### Error Handling

API routes wrap service calls in try/catch and pass errors to `handleServiceError()` from `lib/api-errors.ts`:

| Prisma Error Code | HTTP Status | Meaning      |
| ----------------- | ----------- | ------------ |
| P2002             | 409         | Duplicate    |
| P2025             | 404         | Not found    |
| (other)           | 500         | Server error |

## Database Connection

The app uses `@prisma/adapter-pg` with a `pg.Pool` connection to PostgreSQL via `DATABASE_URL`. The target can be local PostgreSQL or Supabase Postgres. The Prisma client singleton lives in `src/lib/db.ts`.

For migrations, `prisma.config.ts` reads `DATABASE_URL` and passes it to the Prisma CLI.

Prisma migrations create application tables and some seed/upsert data. The `supabase/migrations/` tree contains Supabase-specific SQL, including storage bucket setup and some historical DB SQL. The operational-compliance DB tables are created by Prisma migration SQL; its Supabase migration creates the private audit asset bucket.

## Auth Flow

1. User submits credentials to `/api/auth/[...nextauth]`
2. NextAuth `authorize` callback verifies bcrypt hash, builds `EffectiveUserContext`
3. JWT token stores: id, email, name, role, roleSubtypeId, roleLabel, locationIds, permissionKeys
4. On every token refresh, permissions are re-fetched from the database
5. API routes call `requireAuth()` / `requirePermission()` from `identity-access/middleware.ts`
6. Middleware returns the `{error, session, user}` triple; routes destructure and guard early

## File Placement Conventions

| New thing               | Where it goes                                               |
| ----------------------- | ----------------------------------------------------------- |
| Business logic          | `src/modules/<module>/service.ts`                           |
| Types/interfaces        | `src/modules/<module>/types.ts`                             |
| API endpoint            | `src/app/api/<resource>/route.ts` (or `[id]/route.ts`)      |
| Zod schema              | `src/lib/validations.ts`                                    |
| UI page                 | `src/app/<role-section>/<page>/page.tsx`                    |
| Shared UI component     | `src/components/shared/`                                    |
| Role-specific component | `src/components/<role>/`                                    |
| Base UI primitive       | `src/components/ui/`                                        |
| Test file               | Next to the file it tests: `<name>.test.ts`                 |
| Utility function        | `src/lib/utils.ts` (or a new file in `lib/` if substantial) |
