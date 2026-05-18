# Pattern: API Route Handler

Every API route in `src/app/api/` follows the same structure.
Copy this template when creating new routes.

## Canonical Template

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { mySchema } from "@/lib/validations";
import { doSomething } from "@/modules/<module>/service";
import { createAuditEvent } from "@/modules/audit/service";

// GET -- List or read
export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  // Optional: permission check
  if (!hasPermission(user, "some.permission")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await doSomething();
  return NextResponse.json(result);
}

// POST -- Create
export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!hasPermission(user, "some.permission")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = mySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await doSomething(parsed.data);

    // Fire-and-forget audit
    createAuditEvent({
      entityType: "MyEntity",
      entityId: result.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
```

## Rules

1. **Auth first.** Every handler starts with `requireAuth()` or a more specific guard (`requirePermission`, `requireRole`).
2. **Destructure the triple.** Always use `const { error, user } = await requireAuth()` and guard with `if (error || !user) return error!`.
3. **Permission check.** Use `hasPermission(user, key)` for fine-grained checks after auth.
4. **Validate input.** Use `safeParse` (not `parse`) so you control the error response.
5. **Call service.** Never write Prisma queries in a route handler. Always delegate to a service function.
6. **Audit.** Call `createAuditEvent()` after successful writes unless the owning module documents a module-owned audit trail. Use `.catch(() => {})` to fire-and-forget.
7. **Error mapping.** Wrap service calls in try/catch and return `handleServiceError(err)`.
8. **No business logic.** Routes are thin controllers. All rules, validation beyond schema shape, and data transformations belong in the service layer.

## Current Route Variants

| Variant                  | Pattern                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| JSON body                | Use shared or route-local Zod schema and `safeParse`.                                                                  |
| `FormData` upload        | Use `await req.formData()`, validate required fields/files in the route, and let the service enforce file constraints. |
| Server-sent events       | Return `text/event-stream`; document every emitted event `type` in `DATA-CONTRACTS.md`.                                |
| Module-owned audit trail | If the module owns specialized audit records, document that exception in the module doc and `docs/modules/audit.md`.   |

## Dynamic Route Segments

For routes with `[id]`, the second argument provides params:

```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

## Query Parameters

Read search params from the request URL:

```typescript
const { searchParams } = new URL(req.url);
const locationId = searchParams.get("locationId") ?? undefined;
```

## File Placement

| Route path                     | File location                               |
| ------------------------------ | ------------------------------------------- |
| `GET /api/tastings`            | `src/app/api/tastings/route.ts`             |
| `GET /api/tastings/:id`        | `src/app/api/tastings/[id]/route.ts`        |
| `POST /api/config/campuses`    | `src/app/api/config/campuses/route.ts`      |
| `PATCH /api/config/campuses/1` | `src/app/api/config/campuses/[id]/route.ts` |
