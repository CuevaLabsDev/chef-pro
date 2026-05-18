# Pattern: Service Function

All business logic lives in service functions inside `src/modules/<module>/service.ts`.
These are plain async functions that import `prisma` from `@/lib/db`.

## Basic Query Pattern

```typescript
import { prisma } from "@/lib/db";

export async function getWidgets(): Promise<Widget[]> {
  return prisma.widget.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWidgetById(id: string): Promise<Widget | null> {
  return prisma.widget.findUnique({ where: { id } });
}
```

## Create Pattern

```typescript
export async function createWidget(input: CreateWidgetInput): Promise<Widget> {
  return prisma.widget.create({
    data: {
      name: input.name,
      // map input fields to DB columns
    },
  });
}
```

## Upsert Pattern (for idempotent operations)

```typescript
export async function ensureWidget(name: string): Promise<Widget> {
  return prisma.widget.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}
```

## Transaction Pattern

Use `prisma.$transaction()` when a single operation requires multiple writes that must succeed or fail together:

```typescript
export async function submitSession(sessionId: string, chefId: string): Promise<TastingSession> {
  const session = await prisma.$transaction(async (tx) => {
    const updated = await tx.tastingSession.update({
      where: { id: sessionId },
      data: { status: "submitted", submittedAt: new Date() },
    });

    await tx.auditEvent.create({
      data: {
        entityType: "TastingSession",
        entityId: sessionId,
        action: "submitted",
        actorId: chefId,
        actorName: "...",
      },
    });

    return updated;
  });

  // Publish event AFTER the transaction commits
  await eventBus.publish("session_submitted", chefId, sessionId, "TastingSession", {
    status: "submitted",
  });

  return session;
}
```

**Key rule:** Never call `eventBus.publish()` inside a transaction. If the transaction rolls back, the event would already have been dispatched.

## Event Publishing Pattern

After a meaningful state change, publish a domain event so subscribers can handle side effects:

```typescript
import { eventBus } from "@/modules/events/bus";
import { ensureSubscriptions } from "@/modules/events/subscriptions";

// Call once at module level or in the API route that imports this service
ensureSubscriptions();

export async function doImportantThing(actorId: string): Promise<Result> {
  const result = await prisma.thing.update({ ... });

  await eventBus.publish(
    "thing_happened",    // DomainEventType
    actorId,             // who did it
    result.id,           // entity ID
    "Thing",             // entity type
    { key: "value" },    // payload
  );

  return result;
}
```

## Audit Pattern

For operations that don't use the event bus, call `createAuditEvent` directly:

```typescript
import { createAuditEvent } from "@/modules/audit/service";

export async function updateWidget(id: string, data: UpdateInput): Promise<Widget> {
  const widget = await prisma.widget.update({
    where: { id },
    data,
  });

  // Fire-and-forget: don't let audit failure break the operation
  createAuditEvent({
    entityType: "Widget",
    entityId: widget.id,
    action: "updated",
    actorId: data.actorId,
    actorName: data.actorName,
  }).catch(() => {});

  return widget;
}
```

## Rules

1. **Services own all Prisma calls.** No other layer touches `prisma` directly.
2. **No HTTP concepts.** Services never import `NextRequest`, `NextResponse`, or return status codes.
3. **Type inputs and outputs.** Define types in the module's `types.ts`. Use them for function signatures.
4. **Transactions for multi-table writes.** If two writes must be atomic, use `$transaction`.
5. **Events after commit.** Publish domain events after the database write succeeds, never inside a transaction.
6. **Audit on mutations.** Every create/update/delete should produce audit coverage, either through generic `AuditEvent` rows, domain-event subscribers, or a documented module-owned audit trail.
7. **Soft delete.** Set `isActive: false` instead of deleting records. Query with `where: { isActive: true }` by default.
8. **Return domain types.** Don't return raw Prisma types with internal fields. Map to types from `types.ts` if needed.

## AI And File Services

- AI services may keep service-local Zod schemas for model-output validation.
- Store prompt/model/schema versions when generated records need an audit trail.
- File services should store durable assets in Supabase or another durable store before analysis when the original must be retained.
- Do not describe third-party AI output as final compliance/legal findings; store confidence and manager-review status when applicable.
