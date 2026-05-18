# Workflow: Add an RBAC Permission

Follow these steps when a new feature requires a permission key that doesn't exist yet.

## Step 1: Add to Permission Catalog

**File:** `src/modules/identity-access/rbac-config.ts`

Add a new entry to the `PERMISSION_CATALOG` array:

```typescript
{
  key: "domain.action",
  name: "Human-Readable Name",
  description: "What this permission allows the user to do.",
}
```

**Naming convention:** `<domain>.<action>` (e.g., `tastings.create`, `packets.execute`, `reports.view`).

The `PermissionKey` type is derived from this array automatically.

## Step 2: Assign to Role Subtypes

**File:** `src/modules/identity-access/rbac-config.ts`

Add the new key to the `permissionKeys` array of relevant entries in `DEFAULT_SUBTYPE_DEFINITIONS`:

```typescript
{
  role: "chef",
  code: "sous",
  label: "Sous",
  permissionKeys: [
    "tastings.create",
    "tastings.edit",
    "tastings.submit",
    "packets.read",
    "packets.execute",
    "domain.action",  // <-- add here
  ],
}
```

Decide which subtypes should have this permission by default. FTE subtypes (`fte_chef`, `fte_ops`) typically get all permissions.

## Step 3: Update Runtime Defaults And Seed Data

**File:** `prisma/seed.ts`

No direct change is usually needed -- it reads from `PERMISSION_CATALOG` and `DEFAULT_SUBTYPE_DEFINITIONS` dynamically.

**File:** `src/modules/identity-access/service.ts`

Update fallback role permissions if the permission should exist before subtype records are available.

**Migration SQL**

If the permission must deploy without immediately running seed, add an idempotent migration upsert for `Permission` and any default `RoleSubtypePermission` rows.

## Step 4: Apply to Database

### Local Database

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql -h localhost -p 5432 -U cuevacarlos -d chefpro -c "
INSERT INTO \"Permission\" (id, key, name, description, \"createdAt\")
VALUES ('perm_XX', 'domain.action', 'Human-Readable Name', 'Description', NOW())
ON CONFLICT (key) DO NOTHING;
"
```

Or re-run the full seed:

```bash
npm run db:seed
```

### Supabase / Remote PostgreSQL

Apply the Prisma migration to the target PostgreSQL database, then run seed if needed. Avoid manual SQL that diverges from migration/seed definitions.

## Step 5: Use in Route Guard

**File:** `src/app/api/<resource>/route.ts`

```typescript
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!hasPermission(user, "domain.action")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ...
}
```

## Step 6: Verify

```bash
npm run typecheck    # PermissionKey type should include the new key
npm run lint
npm test
```

## Checklist

- [ ] Added to `PERMISSION_CATALOG` in `rbac-config.ts`
- [ ] Added to relevant subtypes in `DEFAULT_SUBTYPE_DEFINITIONS`
- [ ] Added to fallback role permissions if needed
- [ ] Added to migration seed/upsert SQL if deployment requires it
- [ ] Applied to local database
- [ ] Applied to remote PostgreSQL/Supabase through Prisma migration or seed
- [ ] Used in route guard
- [ ] `docs/domain-model.md` and `docs/modules/identity-access.md` updated
- [ ] TypeScript compiles
