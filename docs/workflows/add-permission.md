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

Decide which subtypes should have this permission by default. FTE subtypes (`cafe_chef`, `fte_ops`) typically get all permissions.

## Step 3: Update Seed Data

**File:** `prisma/seed.sql`

Add a new `INSERT INTO "Permission"` row:

```sql
('perm_XX', 'domain.action', 'Human-Readable Name', 'Description', NOW()),
```

Add corresponding `INSERT INTO "RoleSubtypePermission"` rows for each subtype that should have this permission.

**File:** `prisma/seed.ts`

No changes needed -- it reads from `PERMISSION_CATALOG` and `DEFAULT_SUBTYPE_DEFINITIONS` dynamically.

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

### Supabase

Run the same INSERT in the Supabase SQL Editor.

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
- [ ] Added to `prisma/seed.sql`
- [ ] Applied to local database
- [ ] Applied to Supabase (when network available)
- [ ] Used in route guard
- [ ] TypeScript compiles
