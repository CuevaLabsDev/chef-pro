# Module: review-compliance

**Path:** `src/modules/review-compliance/`
**Purpose:** Review workflow for tasting sessions (status transitions) and compliance reporting.

## Files

| File         | Role                                           |
| ------------ | ---------------------------------------------- |
| `service.ts` | Status transitions, unlock, compliance summary |
| `types.ts`   | ReviewAction, ComplianceSummary, filter types  |

## Dependencies

- `@/lib/db` (Prisma)
- `@/modules/events/bus` (publishes domain events)
- `@/modules/events/subscriptions` (ensures subscribers are registered)

## Service Exports

| Function               | Signature                                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| `transitionSession`    | `(input: TransitionSessionInput, reviewerId: string) => Promise<TastingSession>` |
| `unlockSession`        | `(sessionId: string, reviewerId: string) => Promise<TastingSession>`             |
| `getComplianceSummary` | `(dateFrom: string, dateTo: string) => Promise<ComplianceSummary[]>`             |

## Behavior Rules

1. **Transition** is atomic: Prisma `$transaction` wraps status update + ReviewAction creation + AuditEvent creation.
2. **Valid transitions**: `submitted -> reviewed`, `submitted -> locked`, `reviewed -> locked`.
3. **Unlock** reverses `locked -> submitted`. Also atomic with ReviewAction + AuditEvent.
4. **Compliance summary** aggregates by location and date: total expected, submitted, reviewed, late, missing, compliance rate.

## Domain Events Published

| Event              | When                               |
| ------------------ | ---------------------------------- |
| `session_reviewed` | After submitted -> reviewed        |
| `session_locked`   | After submitted/reviewed -> locked |
| `session_unlocked` | After locked -> submitted          |

## API Routes

| Route               | Methods | Permission       |
| ------------------- | ------- | ---------------- |
| `/api/reviews`      | POST    | `reviews.manage` |
| `/api/reviews/[id]` | POST    | `reviews.unlock` |
| `/api/reviews/[id]` | GET     | `reviews.manage` |
| `/api/reports`      | GET     | `reports.view`   |

The POST to `/api/reviews/[id]` uses `body.action === "unlock"` to trigger `unlockSession`.
