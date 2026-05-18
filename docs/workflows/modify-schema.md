# Workflow: Modify the Database Schema

Schema changes are high-impact. Follow this process carefully.

## Pre-Work

- [ ] Read `docs/domain-model.md` to understand existing entities and relationships.
- [ ] Prefer additive changes (new columns, new tables) over destructive ones (dropping columns/tables).
- [ ] If removing a column, consider making it nullable first, then removing in a later release.

## Step 1: Edit Prisma Schema

**File:** `prisma/schema.prisma`

Make your changes. Follow existing conventions:

- `@id @default(cuid())` for primary keys
- `@default(now())` for `createdAt`
- `@updatedAt` for `updatedAt`
- `@unique` for natural uniqueness constraints
- `@@unique([...])` for composite uniqueness
- `@@index([...])` for query-critical indexes
- `Boolean @default(true)` for `isActive` fields

## Step 2: Write Migration SQL

**File:** `prisma/migrations/<timestamp>_<name>/migration.sql`

Write the Prisma migration SQL for the application schema change. This gets applied to whichever PostgreSQL database `DATABASE_URL` targets, including local PostgreSQL or Supabase Postgres.

### Adding a column

```sql
ALTER TABLE "MyTable" ADD COLUMN "newField" TEXT;
```

### Adding a table

```sql
CREATE TABLE "NewTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewTable_pkey" PRIMARY KEY ("id")
);
```

### Adding a foreign key

```sql
ALTER TABLE "ChildTable" ADD CONSTRAINT "ChildTable_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ParentTable"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

## Step 3: Apply to Local Database

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql \
  -h localhost -p 5432 -U cuevacarlos -d chefpro \
  -c "<your SQL statement>"
```

Or if you have a migration file:

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql \
  -h localhost -p 5432 -U cuevacarlos -d chefpro \
  -f prisma/migration-v2.sql
```

## Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

This updates the TypeScript types. If it fails, the schema has a validation error -- fix it before continuing.

## Step 5: Update Affected Services

Search for usages of the modified model:

```bash
rg "prisma\.<modelName>" src/
```

Update service functions to handle:

- New required fields (add to create/update inputs)
- Removed fields (remove references)
- New relationships (add includes where needed)
- Changed types (update TypeScript types in `types.ts`)

## Step 6: Update Zod Schemas

**File:** `src/lib/validations.ts`

Update any schemas that correspond to the changed model:

- New required fields must be added to create schemas
- New optional fields should be added to update schemas
- Removed fields should be removed from schemas

## Step 7: Update Seed Data

**Files:** `prisma/seed.sql`, `prisma/seed.ts`

If the change adds required columns to seeded tables, update the seed files to include values for the new columns.

## Step 8: Apply Remote / Supabase Changes

For Supabase Postgres, apply the Prisma migration through the Prisma CLI against the Supabase `DATABASE_URL`. The `supabase/migrations/` tree is for Supabase-specific SQL, such as storage bucket setup and some historical DB SQL; do not assume every Prisma migration has a matching Supabase migration.

If the schema change adds or changes a Supabase Storage bucket, add a separate idempotent SQL file under `supabase/migrations/`.

## Step 9: Verify

```bash
npx prisma generate     # types correct
npm run typecheck        # no compile errors
npm run lint
npm test                 # all tests pass
```

## Step 10: Update Docs

If the schema change introduces a new entity or significantly changes an existing one:

- Update `docs/domain-model.md`
- Update the relevant `docs/modules/<module>.md`

## Checklist

- [ ] Schema edited in `prisma/schema.prisma`
- [ ] Prisma migration SQL written
- [ ] Applied to local PostgreSQL
- [ ] Prisma client regenerated
- [ ] Affected services updated
- [ ] Zod schemas updated
- [ ] Seed data updated
- [ ] All checks pass (generate, typecheck, lint, test)
- [ ] Domain model docs updated (if significant change)
- [ ] Remote/Supabase PostgreSQL migration applied when relevant
- [ ] Supabase-specific storage/bucket SQL added and applied when relevant
