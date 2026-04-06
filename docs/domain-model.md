# Domain Model

## Entity Groups

### Identity & Access

| Entity                 | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| User                   | System user with role, subtype, location access |
| UserLocationAccess     | Junction: which user can access which location  |
| Permission             | Named permission key (e.g. `tastings.create`)   |
| RoleSubtype            | Named variant within a role (e.g. `sous` chef)  |
| RoleSubtypePermission  | Default permissions for a subtype               |
| UserPermissionOverride | Per-user grant/revoke of individual permissions |

### Configuration

| Entity         | Purpose                                        |
| -------------- | ---------------------------------------------- |
| Campus         | Top-level grouping of buildings                |
| Building       | Groups locations within a campus               |
| Location       | Physical dining location where tastings happen |
| TastingPeriod  | Meal period: Breakfast, Lunch, Dinner          |
| DeadlineRule   | Per-location, per-period submission deadline   |
| RatingSchema   | Versioned set of rating questions              |
| RatingQuestion | Individual question within a schema            |

### Tasting Capture

| Entity         | Purpose                                               |
| -------------- | ----------------------------------------------------- |
| TastingSession | A chef's tasting for a specific date/location/period  |
| TastingItem    | A single dish within a session                        |
| RatingResponse | A score or text response for one question on one item |

### Menu Signage

| Entity                | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| MenuSignagePacket     | A day's menu package for a location/meal                             |
| MenuSignageItem       | A single menu item within a packet                                   |
| PacketReviewSignature | A typed review signature on a packet                                 |
| PacketAmendment       | A tracked change request on a packet (item swap, backup, correction) |

### Cross-Cutting

| Entity            | Purpose                             |
| ----------------- | ----------------------------------- |
| ReviewAction      | Audit record of a status transition |
| AuditEvent        | Generic audit trail entry           |
| NotificationEvent | In-app or external notification     |
| PushSubscription  | Web push subscription for a user    |
| ExportJob         | Queued CSV/report export            |

## Relationships

```
Campus
  └── Building (1:many)
        └── Location (1:many)
              ├── UserLocationAccess (many:many with User)
              ├── DeadlineRule (1:many, one per TastingPeriod)
              ├── TastingSession (1:many)
              └── MenuSignagePacket (1:many)

User
  ├── RoleSubtype (many:1, optional)
  ├── UserLocationAccess (1:many)
  ├── KitchenAdminManagerAssignment (1:many as manager, 1:many as managed kitchen admin)
  ├── UserPermissionOverride (1:many)
  ├── PushSubscription (1:many)
  ├── TastingSession (1:many, as chef)
  └── MenuSignagePacket (1:many, as creator/assigned/publisher/reviewer/finalizer)

TastingSession
  ├── TastingItem (1:many)
  │     └── RatingResponse (1:many)
  ├── ReviewAction (1:many)
  └── MenuSignagePacket (1:1, optional link)

MenuSignagePacket
  ├── MenuSignageItem (1:many)
  ├── PacketReviewSignature (1:many)
  └── PacketAmendment (1:many)
        └── MenuSignageItem (many:1, optional — the item being amended)
```

## State Machines

### Tasting Session Status

```
draft ──────► submitted ──────► reviewed ──────► locked
                  │                                  │
                  └──────────► locked                 │
                                                     │
                               submitted ◄──── (unlock)
```

**Transition rules:**

| From      | To        | Who can do it               | How                                         |
| --------- | --------- | --------------------------- | ------------------------------------------- |
| draft     | submitted | Chef (session owner)        | `submitTastingSession()` in tasting-capture |
| submitted | reviewed  | Reviewer (`reviews.manage`) | `transitionSession()` in review-compliance  |
| submitted | locked    | Reviewer (`reviews.manage`) | `transitionSession()` in review-compliance  |
| reviewed  | locked    | Reviewer (`reviews.manage`) | `transitionSession()` in review-compliance  |
| locked    | submitted | Reviewer (`reviews.unlock`) | `unlockSession()` in review-compliance      |

**Constraints:**

- Only the session's chef can submit (draft -> submitted).
- Edits are blocked once status is `locked`.
- Editing a submitted/reviewed session publishes `session_edited_post_submit` event (triggers notifications).
- All transitions are atomic: Prisma `$transaction` wraps the status update, ReviewAction creation, and AuditEvent creation.

### Menu Signage Packet Status

```
draft ──────► published ──────► for_final_review ──────► finalized_for_service
```

Packets have two update modes:

- **Structure mode** (`packets.manage_structure`): metadata, items, assignment
- **Execution mode** (`packets.execute`): checklists, backup flags, per-item readiness
- **Workflow actions**: publish, send for final review, add signatures, finalize for service

**Workflow constraints:**

- Only users with `packets.publish` can publish a packet.
- Any location-scoped reviewer can add a review signature.
- A packet requires at least two unique signatures before final service sign-off.
- Only users with `packets.finalize_service` can complete final service sign-off.

## RBAC Permission Resolution

Permissions are resolved in three layers, with later layers overriding earlier ones:

```
Layer 1: Fallback Role Permissions (hardcoded base per role)
  ▼ overridden by
Layer 2: Role Subtype Defaults (from RoleSubtypePermission records)
  ▼ overridden by
Layer 3: User-Level Overrides (from UserPermissionOverride records)
```

### Example

A user with `role=chef`, `subtype=sous`:

1. **Fallback:** chef role gets `tastings.create`, `tastings.edit`, `tastings.submit`
2. **Subtype defaults:** sous subtype adds `packets.read`, `packets.execute`
3. **User override:** admin grants `reports.view` specifically to this user

Result: `tastings.create`, `tastings.edit`, `tastings.submit`, `packets.read`, `packets.execute`, `reports.view`

### Roles

| Role                    | Intended for                                 |
| ----------------------- | -------------------------------------------- |
| `fte`                   | Full-time employees (superuser)              |
| `ops`                   | Operations management                        |
| `kitchen_admin`         | Kitchen administrators                       |
| `kitchen_admin_manager` | Kitchen admin managers (support + oversight) |
| `chef`                  | Chef team (jr. sous through executive)       |
| `foh`                   | Front-of-house staff                         |

### Subtype Hierarchy

```
fte_ops (rank 110)          ← root
  └── fte_chef (rank 100)
        ├── ops (rank 55)
        │     └── assistant_ops (rank 50)
        ├── executive (rank 40)
        │     └── sr_sous (rank 30)
        │           └── sous (rank 20)
        │                 └── jr_sous (rank 10)
        ├── foh_manager (rank 65)
        │     └── assistant_foh (rank 60)
        └── kitchen_admin_manager (rank 75)
              └── kitchen_admin (rank 70)
```

Reporting at a location is resolved by walking up from the user's rank to
the nearest higher-ranked user assigned to that location.

### Permission Keys (18 total)

| Key                        | Domain             |
| -------------------------- | ------------------ |
| `tastings.create`          | Tasting capture    |
| `tastings.edit`            | Tasting capture    |
| `tastings.submit`          | Tasting capture    |
| `tastings.view_all`        | Tasting capture    |
| `config.manage`            | Configuration      |
| `reviews.manage`           | Review compliance  |
| `reviews.unlock`           | Review compliance  |
| `reports.view`             | Reporting          |
| `notifications.view`       | Notifications      |
| `packets.read`             | Menu signage       |
| `packets.manage_structure` | Menu signage       |
| `packets.execute`          | Menu signage       |
| `packets.override`         | Menu signage       |
| `packets.publish`          | Menu signage       |
| `packets.finalize_service` | Menu signage       |
| `kitchen_admins.manage`    | Kitchen admin team |
| `kitchen_admins.view_as`   | Kitchen admin team |
| `permissions.manage`       | Identity access    |

## Soft Delete Convention

Entities with an `isActive` field use soft deletion. Set `isActive: false` instead of deleting the record. Queries should filter by `isActive: true` unless explicitly showing archived items.

## ID Strategy

All entities use `cuid()` as the primary key (text IDs). Seed data uses human-readable IDs like `campus_main`, `usr_chef` for debuggability.

## Timestamp Convention

- `createdAt`: `@default(now())` -- set automatically
- `updatedAt`: `@updatedAt` -- set automatically by Prisma on every update
- All timestamps are `TIMESTAMP(3)` (millisecond precision)
