# Pattern: Zod Validation

All Zod schemas live in `src/lib/validations.ts`. Routes use `safeParse` to validate request bodies.

## Naming Convention

| Operation | Schema name              | Example                   |
| --------- | ------------------------ | ------------------------- |
| Create    | `create<Entity>Schema`   | `createCampusSchema`      |
| Update    | `update<Entity>Schema`   | `updateLocationSchema`    |
| Filter    | `<entity>FiltersSchema`  | `reviewFiltersSchema`     |
| Action    | `<action><Entity>Schema` | `transitionSessionSchema` |
| Sub-item  | `<entity>ItemSchema`     | `tastingItemSchema`       |

## Basic Schema

```typescript
import { z } from "zod";

export const createCampusSchema = z.object({
  name: z.string().min(1),
});
```

## Schema with Optional/Nullable Fields

Use `.optional()` for fields the client may omit. Use `.nullable()` for fields that can be explicitly set to `null`:

```typescript
export const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  buildingId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
```

## Nested Items

For entities that contain child arrays:

```typescript
export const tastingItemSchema = z.object({
  dishName: z.string().min(1),
  sortOrder: z.number().int().min(0),
  temperatureCompliance: z.enum(["compliant", "non_compliant", "not_checked"]),
  ratings: z.array(ratingResponseSchema),
});

export const createTastingSessionSchema = z.object({
  date: z.coerce.date(),
  locationId: z.string(),
  tastingPeriodId: z.string(),
  items: z.array(tastingItemSchema).min(1),
});
```

## Discriminated Union

When one endpoint handles multiple modes, use a discriminated union on a `mode` field:

```typescript
export const updateMenuSignagePacketSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("structure"),
    data: updateMenuSignagePacketStructureSchema,
  }),
  z.object({
    mode: z.literal("execution"),
    data: updateMenuSignagePacketExecutionSchema,
  }),
]);
```

## Using in Routes

Always use `safeParse`, never `parse`. This lets you return a structured 400 error:

```typescript
const body = await req.json();
const parsed = mySchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
}
// Use parsed.data (fully typed)
```

## Validating Against Known Values

When a field must match a known set (like permission keys), validate against the runtime array:

```typescript
import { ALL_PERMISSION_KEYS } from "@/modules/identity-access/rbac-config";

export const replaceSubtypePermissionsSchema = z.object({
  permissionKeys: z.array(z.string().refine((k) => ALL_PERMISSION_KEYS.includes(k as any))),
});
```

## Rules

1. **All schemas in one file.** `src/lib/validations.ts` is the single location.
2. **Name consistently.** Follow the naming table above.
3. **safeParse in routes.** Never throw from Zod in an API handler.
4. **Coerce dates.** Use `z.coerce.date()` for date fields sent as ISO strings.
5. **Reuse sub-schemas.** If items appear in both create and update, define the item schema once and reference it.
