# Workflow: Add a Domain Event

Follow these steps to add a new event type to the domain event bus.

## Step 1: Add Event Type

**File:** `src/modules/events/types.ts`

Add the new event type string to the `DomainEventType` union:

```typescript
export type DomainEventType =
  | "session_created"
  | "session_submitted"
  // ... existing types ...
  | "my_new_event"; // <-- add here
```

## Step 2: Add Subscriber

**File:** `src/modules/events/subscriptions.ts`

Register a handler in the `ensureSubscriptions()` function:

```typescript
eventBus.subscribe(
  "my_new_event",
  async (event) => {
    // Handle the event: create audit record, send notification, etc.
    await createAuditEvent({
      entityType: event.entityType,
      entityId: event.entityId,
      action: "my_action",
      actorId: event.actorId,
      actorName: "...",
    });
  },
  "my-module" // module name for logging
);
```

Common subscriber actions:

- **Audit:** Call `createAuditEvent()`
- **Notification:** Call `sendNotification()` for affected users
- **Both:** Create audit event + send notification (see `session_edited_post_submit` subscriber for example)

## Step 3: Publish from Service

**File:** `src/modules/<module>/service.ts`

Add the publish call after the database write:

```typescript
import { eventBus } from "@/modules/events/bus";
import { ensureSubscriptions } from "@/modules/events/subscriptions";

ensureSubscriptions();

export async function myServiceFunction(): Promise<Result> {
  const result = await prisma.entity.update({ ... });

  // Publish AFTER the write succeeds, OUTSIDE any transaction
  await eventBus.publish(
    "my_new_event",
    actorId,
    result.id,
    "EntityType",
    { relevant: "payload data" },
  );

  return result;
}
```

## Step 4: Ensure Subscriptions in Route

**File:** The API route that calls this service function.

Make sure `ensureSubscriptions()` is called at the module level of the route file or the service file:

```typescript
import { ensureSubscriptions } from "@/modules/events/subscriptions";
ensureSubscriptions();
```

This is idempotent -- safe to call multiple times.

## Step 5: Update Event Docs

**File:** `docs/modules/events.md`

Add the new event to the "Event Types" table and the "Subscriber Wiring" table.

## Step 6: Verify

```bash
npm run typecheck
npm run lint
npm test
```

## Rules

- Publish after commit, never inside a `$transaction`.
- Subscribers must not throw -- errors are logged but don't propagate.
- Keep payloads small: include IDs and key state, not full entities.
- Update `docs/modules/events.md` with every new event type.

## Checklist

- [ ] Event type added to `DomainEventType` in `events/types.ts`
- [ ] Subscriber registered in `events/subscriptions.ts`
- [ ] `eventBus.publish()` called in the service function
- [ ] `ensureSubscriptions()` called in the route or service
- [ ] `docs/modules/events.md` updated
- [ ] TypeScript compiles, tests pass
