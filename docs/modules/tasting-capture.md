# Module: tasting-capture

**Path:** `src/modules/tasting-capture/`
**Purpose:** CRUD for tasting sessions and their items, including the submit workflow.

## Files

| File         | Role                                        |
| ------------ | ------------------------------------------- |
| `service.ts` | Session CRUD, submit flow, filtered queries |
| `types.ts`   | Session, item, rating types and inputs      |

## Dependencies

- `@/lib/db` (Prisma)
- `@/modules/events/bus` (publishes domain events)
- `@/modules/events/subscriptions` (ensures subscribers are registered)

## Key Types

- **`SessionStatus`**: `"draft" | "submitted" | "reviewed" | "locked"`
- **`TemperatureCompliance`**: `"compliant" | "non_compliant" | "not_checked"`
- **`TastingSession`**: Full session including nested `items[]` with `ratings[]`
- **`TastingItem`**: Dish entry with ratings, temperature compliance, notes
- **`RatingResponse`**: `questionId` + `numericValue?` + `textValue?`

## Service Exports

| Function                     | Signature                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `createTastingSession`       | `(chefId: string, input: CreateTastingSessionInput) => Promise<TastingSession>`                     |
| `updateTastingSession`       | `(sessionId: string, actorId: string, input: UpdateTastingSessionInput) => Promise<TastingSession>` |
| `submitTastingSession`       | `(sessionId: string, chefId: string) => Promise<TastingSession>`                                    |
| `getTastingSession`          | `(id: string) => Promise<TastingSession \| null>`                                                   |
| `getTastingSessionsByChef`   | `(chefId: string, filters?) => Promise<TastingSession[]>`                                           |
| `getTastingSessionsFiltered` | `(filters: ReviewFilters) => Promise<TastingSession[]>`                                             |

## Behavior Rules

1. **Create** publishes `session_created` event.
2. **Update** blocks edits when status is `locked`. If the session is `submitted` or `reviewed`, the update publishes `session_edited_post_submit` (which triggers notifications to ops/fte users).
3. **Submit** uses a Prisma `$transaction` to atomically update status + create audit event. Publishes `session_submitted` after commit.
4. **Uniqueness constraint**: One session per `(date, locationId, tastingPeriodId, chefId)`.

## Domain Events Published

| Event                        | When                                         |
| ---------------------------- | -------------------------------------------- |
| `session_created`            | After creating a new session                 |
| `session_submitted`          | After successful submit (draft -> submitted) |
| `session_edited_post_submit` | After editing a submitted/reviewed session   |

## API Routes

| Route                | Methods | Permission                                               |
| -------------------- | ------- | -------------------------------------------------------- |
| `/api/tastings`      | GET     | `tastings.view_all` or own sessions                      |
| `/api/tastings`      | POST    | `tastings.create`                                        |
| `/api/tastings/[id]` | GET     | `tastings.view_all` or own                               |
| `/api/tastings/[id]` | PATCH   | `tastings.edit` (or `tastings.submit` for submit action) |

The PATCH route uses `body.action === "submit"` to trigger `submitTastingSession` instead of `updateTastingSession`.
