# Module: events

**Path:** `src/modules/events/`
**Purpose:** In-memory domain event bus for decoupling services from side effects.

## Files

| File               | Role                                                     |
| ------------------ | -------------------------------------------------------- |
| `bus.ts`           | `DomainEventBus` class, exported as `eventBus` singleton |
| `types.ts`         | Event types, handler signature, subscription type        |
| `subscriptions.ts` | Registers all event subscribers                          |

## Dependencies

- `@/modules/audit/service` (used by subscribers)
- `@/modules/notifications/service` (used by subscribers)
- `@/modules/identity-access/service` (used by subscribers to find ops/fte users)

## Event Bus API

```typescript
// Subscribe to an event type
eventBus.subscribe(eventType: DomainEventType, handler: EventHandler, module: string): void

// Publish an event (fans out to all subscribers via Promise.allSettled)
eventBus.publish<T>(type, actorId, entityId, entityType, payload, metadata?): Promise<DomainEvent<T>>

// Inspect registered subscriptions
eventBus.getSubscriptions(): ReadonlyArray<EventSubscription>
```

## Event Types

| Event Type                   | Published by              | Payload context                   |
| ---------------------------- | ------------------------- | --------------------------------- |
| `session_created`            | tasting-capture           | New session data                  |
| `session_submitted`          | tasting-capture           | Session status                    |
| `session_edited_post_submit` | tasting-capture           | Edit details on submitted session |
| `session_reviewed`           | review-compliance         | Review transition details         |
| `session_locked`             | review-compliance         | Lock transition details           |
| `session_unlocked`           | review-compliance         | Unlock transition details         |
| `deadline_missed`            | scripts (check-deadlines) | Missed deadline details           |
| `item_photo_uploaded`        | (future)                  | Photo upload details              |
| `config_updated`             | (future)                  | Configuration change details      |

## Subscriber Wiring

Defined in `subscriptions.ts`, registered via `ensureSubscriptions()`:

| Event                        | Module        | Action                                                               |
| ---------------------------- | ------------- | -------------------------------------------------------------------- |
| `session_submitted`          | audit         | Creates audit event                                                  |
| `session_edited_post_submit` | notifications | Creates audit event + sends in-app notification to all ops/fte users |
| `session_reviewed`           | audit         | Creates audit event                                                  |
| `session_locked`             | audit         | Creates audit event                                                  |
| `deadline_missed`            | notifications | Sends in-app notification to all ops/fte users                       |

## Initialization

`ensureSubscriptions()` must be called before events are published. It uses a module-level guard flag to register subscribers only once. Call it at the top of route files that import services which publish events:

```typescript
import { ensureSubscriptions } from "@/modules/events/subscriptions";
ensureSubscriptions();
```

Currently called in the tasting and review API route files.

## Rules

1. **Publish after commit.** Never publish events inside a `$transaction`. The database write must succeed first.
2. **Subscribers are fire-and-forget.** `Promise.allSettled` ensures one failing subscriber doesn't block others.
3. **Register once.** `ensureSubscriptions()` is idempotent; call it wherever needed without worry.
4. **In-memory only.** Events are not persisted. If the process restarts, in-flight events are lost. This is acceptable for the current use cases (audit + notifications).

## Adding a New Event

See `workflows/add-domain-event.md` for the step-by-step process.
