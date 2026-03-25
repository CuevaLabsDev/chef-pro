# Module: notifications

**Path:** `src/modules/notifications/`
**Purpose:** Create and manage in-app and external notification records.

## Files

| File         | Role                                        |
| ------------ | ------------------------------------------- |
| `service.ts` | Notification CRUD                           |
| `types.ts`   | Notification types and channel/status enums |

## Dependencies

- `@/lib/db` (Prisma)

## Key Types

- **`NotificationChannel`**: `"email" | "google_chat" | "in_app"`
- **`NotificationStatus`**: `"pending" | "sent" | "failed"`

## Service Exports

| Function                     | Signature                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| `sendNotification`           | `(input: SendNotificationInput) => Promise<NotificationEvent>`     |
| `getUserNotifications`       | `(userId: string, limit?: number) => Promise<NotificationEvent[]>` |
| `markNotificationSent`       | `(id: string) => Promise<NotificationEvent>`                       |
| `getUnreadNotificationCount` | `(userId: string) => Promise<number>`                              |

## Behavior Rules

1. **In-app notifications** are immediately marked as `"sent"` upon creation.
2. **Other channels** (email, google_chat) stay `"pending"` for future processing.
3. **Related entity linking**: Notifications can reference `relatedEntityType` + `relatedEntityId` for deep linking.

## How Notifications Are Triggered

Notifications are typically created by domain event subscribers, not by API routes directly:

- `session_edited_post_submit` -> sends in-app notification to all ops/fte users
- `deadline_missed` -> sends in-app notification to all ops/fte users

See `modules/events.md` for the subscriber wiring.

## API Routes

| Route                | Methods | Permission           |
| -------------------- | ------- | -------------------- |
| `/api/notifications` | GET     | `notifications.view` |

The GET endpoint returns the user's notifications plus an `unreadCount`.
