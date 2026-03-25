# Module: menu-signage

**Path:** `src/modules/menu-signage/`
**Purpose:** CRUD for menu signage packets (daily menu packages) and their items, with structure updates plus publish/review/approve workflow actions.

## Files

| File         | Role                                                     |
| ------------ | -------------------------------------------------------- |
| `service.ts` | Packet and item CRUD, workflow transitions               |
| `types.ts`   | Packet, item, filter, input types, status display labels |

## Dependencies

- `@/lib/db` (Prisma)

## Key Types

- **`PacketItemCategory`** (enum): `entree`, `vegetarian_entree`, `vegan_entree`, `starches`, `vegetables`, `sides`, `pastry`, `back_up`
- **`MENU_PACKET_CATEGORY_OPTIONS`**: Runtime constant array of category values.
- **`STATUS_DISPLAY_LABEL`**: Maps internal status keys to user-friendly labels (`draft` → "Building", `published` → "Ready for Review", `for_final_review` → "In Review", `finalized_for_service` → "Approved").
- **`MENU_PACKET_DIET_TAG_OPTIONS`**: Diet tag options, used as single-select in the UI.

## Service Exports

| Function                           | Signature                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `createMenuSignagePacket`          | `(createdById: string, input: CreateMenuSignagePacketInput) => Promise<Packet>` |
| `getMenuSignagePacket`             | `(id: string) => Promise<Packet \| null>`                                       |
| `listMenuSignagePackets`           | `(filters: MenuSignageFilters, locationIds?: string[]) => Promise<Packet[]>`    |
| `updateMenuSignagePacketStructure` | `(packetId: string, input: UpdateStructureInput) => Promise<Packet>`            |
| `updateMenuSignagePacketExecution` | `(packetId: string, input: UpdateExecutionInput) => Promise<Packet>`            |
| `publishMenuSignagePacket`         | `(packetId: string, actorId: string) => Promise<Packet>`                        |
| `submitPacketForFinalReview`       | `(packetId: string, actorId: string) => Promise<Packet>`                        |
| `addPacketReviewSignature`         | `(packetId: string, actor, input) => Promise<Packet>`                           |
| `finalizePacketForService`         | `(packetId: string, actor, input) => Promise<Packet>`                           |
| `deleteMenuSignagePacket`          | `(packetId: string) => Promise<void>`                                           |

## Audit Diff

The `src/modules/audit/diff.ts` module provides `diffPacketStructure(oldPacket, newInput)` which returns field-level change entries (`{ fieldName, oldValue, newValue }`). The PATCH handler for structure updates uses this to record detailed diffs in audit event metadata under a `changes` array.

## Update Modes

### Structure Mode (`packets.manage_structure` or reviewer edit)

- Edit metadata: date, meal, theme
- Replace items: delete existing items and create new ones in a transaction
- Kitchen admins use this when building the menu; reviewers can edit when status is "Ready for Review" or "In Review"
- Field-level diffs are recorded in audit events

### Execution Mode (`packets.execute`)

- Update checklists and backup flags
- Kept in backend for legacy data compatibility (Service Checklist UI removed)

The API discriminates via a `mode` field in the request body.

Additional workflow modes:

- **Publish / Send for Review** (`packets.publish`): move from Building to Ready for Review
- **Submit for final review / Mark as Reviewed** (`packets.execute` or `packets.manage_structure`): move to In Review queue
- **Add signature** (`packets.read` + location scope): capture typed signature
- **Approve for Service** (`packets.finalize_service`): requires minimum two unique signatures

## Behavior Rules

1. **Uniqueness**: One packet per `(date, locationId, meal)`.
2. **Location scoping**: `listMenuSignagePackets` filters by `accessibleLocationIds` unless the user has global access.
3. **Item replacement**: Structure updates with `items` replace all existing items in a transaction.
4. **Two-signature gate**: Approve-for-service requires at least two unique signer records.
5. **Optional tasting link**: A packet can optionally link to a TastingSession via `tastingSessionId`.
6. **Diet tags**: Stored as `String[]` in DB but presented as single-select in the UI (one tag or none).

## Amendments

Amendments track post-publish changes to a packet (item swaps, backup usage, corrections). They provide an audit-friendly record of why items changed after the initial menu was built.

### Amendment Types

| Type           | Meaning                               |
| -------------- | ------------------------------------- |
| `item_change`  | An existing item was modified         |
| `backup_swap`  | A backup item replaced a primary item |
| `item_removed` | An item was removed from the menu     |
| `item_added`   | A new item was added to the menu      |

### Amendment Reasons

| Reason             | Meaning                            |
| ------------------ | ---------------------------------- |
| `tasting_feedback` | Changed based on tasting results   |
| `prep_change`      | Changed due to prep/kitchen issues |
| `service_change`   | Changed during service             |
| `correction`       | Correcting an error                |

### Amendment Status

`pending` → `applied` or `dismissed`

## Frontend Routes

| Route                        | Purpose                                 | Accessible To                                       |
| ---------------------------- | --------------------------------------- | --------------------------------------------------- |
| `/menu-signage`              | Kitchen admin dashboard (all statuses)  | kitchen_admin, kitchen_admin_manager, foh, fte, ops |
| `/menu-signage/new`          | Create new menu                         | `packets.manage_structure`                          |
| `/menu-signage/[id]`         | Full detail / manage view               | `packets.read` + location                           |
| `/menu-signage/review`       | Review queue (today's reviewable menus) | `packets.read` (chef/foh/ops/fte)                   |
| `/menu-signage/[id]/review`  | Specialized review + edit + sign view   | `packets.read` + `packets.execute`                  |
| `/menu-signage/[id]/changes` | Detailed per-field change history       | `packets.read` + location                           |
| `/menu-signage/amendments`   | Amendment queue (pending sign changes)  | `packets.execute`                                   |

## API Routes

| Route                                        | Methods | Permission                                                                                                   |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `/api/packets`                               | GET     | `packets.read`                                                                                               |
| `/api/packets`                               | POST    | `packets.manage_structure`                                                                                   |
| `/api/packets/[id]`                          | GET     | `packets.read` + location access check                                                                       |
| `/api/packets/[id]`                          | PATCH   | mode-dependent: `packets.manage_structure`, `packets.execute`, `packets.publish`, `packets.finalize_service` |
| `/api/packets/[id]`                          | DELETE  | `packets.manage_structure` or `packets.override`                                                             |
| `/api/packets/[id]/history`                  | GET     | `packets.read` + location access check                                                                       |
| `/api/packets/amendments`                    | GET     | `packets.execute`                                                                                            |
| `/api/packets/[id]/amendments/[amendmentId]` | PATCH   | `packets.execute`                                                                                            |

## Side Effects

- No domain events published.
- Audit events created in the API route handlers with field-level diffs for structure updates.
