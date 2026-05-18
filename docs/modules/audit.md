# Module: audit

**Path:** `src/modules/audit/`
**Purpose:** Generic audit trail for all entity changes.

## Files

| File         | Role                       |
| ------------ | -------------------------- |
| `service.ts` | Audit event CRUD           |
| `types.ts`   | AuditEvent type and inputs |

## Dependencies

- `@/lib/db` (Prisma)

## Service Exports

| Function                  | Signature                                                         |
| ------------------------- | ----------------------------------------------------------------- |
| `createAuditEvent`        | `(input: CreateAuditEventInput) => Promise<AuditEvent>`           |
| `getAuditEventsForEntity` | `(entityType: string, entityId: string) => Promise<AuditEvent[]>` |
| `getRecentAuditEvents`    | `(limit?: number) => Promise<AuditEvent[]>`                       |

## Audit Event Fields

| Field      | Type   | Required | Description                            |
| ---------- | ------ | -------- | -------------------------------------- |
| entityType | string | yes      | e.g. "TastingSession", "Campus"        |
| entityId   | string | yes      | ID of the affected entity              |
| action     | string | yes      | e.g. "created", "updated", "submitted" |
| actorId    | string | yes      | User who performed the action          |
| actorName  | string | yes      | Display name of the actor              |
| fieldName  | string | no       | Specific field that changed            |
| oldValue   | string | no       | Previous value (for updates)           |
| newValue   | string | no       | New value (for updates)                |
| metadata   | JSON   | no       | Any additional structured data         |

## Usage Patterns

### From API Routes (fire-and-forget)

```typescript
createAuditEvent({
  entityType: "Campus",
  entityId: campus.id,
  action: "created",
  actorId: user.id,
  actorName: user.name,
}).catch(() => {});
```

### From Domain Event Subscribers

The event bus subscriptions in `events/subscriptions.ts` create audit events for:

- `session_submitted`
- `session_reviewed`
- `session_locked`

### Inside Transactions

For atomic operations (review transitions), audit events are created inside the `$transaction`:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.tastingSession.update({ ... });
  await tx.reviewAction.create({ ... });
  await tx.auditEvent.create({ data: { ... } });
});
```

## Rules

1. **Every mutation should audit.** Either directly in the route or via a domain event subscriber.
2. **Fire-and-forget from routes.** Use `.catch(() => {})` so audit failures don't break the user operation.
3. **Inside transactions for atomic flows.** Review transitions create the audit event in the same transaction.
4. **Consistent entity types.** Use the Prisma model name: `"TastingSession"`, `"Campus"`, `"User"`, etc.

## Module-Owned Audit Records

Generic `AuditEvent` rows are the default audit trail for most mutations. A module may own a specialized audit trail when the records themselves are the operational artifact.

Current exception: `operational-compliance` stores `OperationalAudit`, `OperationalAuditAsset`, `ClosingPhoto`, `TemperatureLog`, `TemperatureEntry`, and `ComplianceIssue` records as its compliance audit trail. It does not currently create generic `AuditEvent` rows for upload, analysis, reanalysis, or issue-status changes.
