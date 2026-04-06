# Data Contracts

Single-source reference for all data structures, validation schemas, API routes, and domain events in ChefPro.

---

## Prisma Models

Source: `prisma/schema.prisma`

### Identity & Access

**User**

| Field         | Type      | Notes            |
| ------------- | --------- | ---------------- |
| id            | String    | cuid, PK         |
| email         | String    | unique           |
| name          | String    |                  |
| passwordHash  | String    |                  |
| role          | Role enum | default: `chef`  |
| roleSubtypeId | String?   | FK → RoleSubtype |
| roleLabel     | String?   |                  |
| isActive      | Boolean   | default: true    |
| createdAt     | DateTime  | auto             |
| updatedAt     | DateTime  | auto             |

Relations: `locationAccess[]`, `roleSubtype?`, `permissionRules[]`, `tastingSessions[]`, `reviewActions[]`, `auditEvents[]`, `notifications[]`, `exportJobs[]`, `createdPackets[]`, `assignedPackets[]`

**Role** enum: `fte`, `ops`, `kitchen_admin`, `kitchen_admin_manager`, `chef`, `foh`

**UserLocationAccess**

| Field      | Type     | Notes         |
| ---------- | -------- | ------------- |
| id         | String   | cuid, PK      |
| userId     | String   | FK → User     |
| locationId | String   | FK → Location |
| createdAt  | DateTime | auto          |

Unique: `[userId, locationId]`

**KitchenAdminManagerAssignment**

| Field          | Type     | Notes                               |
| -------------- | -------- | ----------------------------------- |
| id             | String   | cuid, PK                            |
| managerId      | String   | FK → User (`kitchen_admin_manager`) |
| kitchenAdminId | String   | FK → User (`kitchen_admin`)         |
| createdAt      | DateTime | auto                                |

Unique: `[managerId, kitchenAdminId]`

**Permission**

| Field       | Type     | Notes    |
| ----------- | -------- | -------- |
| id          | String   | cuid, PK |
| key         | String   | unique   |
| name        | String   |          |
| description | String?  |          |
| createdAt   | DateTime | auto     |

**RoleSubtype**

| Field     | Type     | Notes         |
| --------- | -------- | ------------- |
| id        | String   | cuid, PK      |
| role      | Role     |               |
| code      | String   |               |
| label     | String   |               |
| isActive  | Boolean  | default: true |
| createdAt | DateTime | auto          |
| updatedAt | DateTime | auto          |

Unique: `[role, code]`

**RoleSubtypePermission**

| Field        | Type    | Notes            |
| ------------ | ------- | ---------------- |
| id           | String  | cuid, PK         |
| subtypeId    | String  | FK → RoleSubtype |
| permissionId | String  | FK → Permission  |
| isAllowed    | Boolean | default: true    |

Unique: `[subtypeId, permissionId]`

**UserPermissionOverride**

| Field        | Type    | Notes           |
| ------------ | ------- | --------------- |
| id           | String  | cuid, PK        |
| userId       | String  | FK → User       |
| permissionId | String  | FK → Permission |
| isAllowed    | Boolean |                 |

Unique: `[userId, permissionId]`

### Configuration

**Campus**

| Field     | Type     | Notes         |
| --------- | -------- | ------------- |
| id        | String   | cuid, PK      |
| name      | String   | unique        |
| isActive  | Boolean  | default: true |
| createdAt | DateTime | auto          |
| updatedAt | DateTime | auto          |

Relations: `buildings[]`

**Building**

| Field     | Type     | Notes         |
| --------- | -------- | ------------- |
| id        | String   | cuid, PK      |
| name      | String   |               |
| campusId  | String   | FK → Campus   |
| isActive  | Boolean  | default: true |
| createdAt | DateTime | auto          |
| updatedAt | DateTime | auto          |

Unique: `[campusId, name]`. Relations: `campus`, `locations[]`

**Location**

| Field       | Type     | Notes         |
| ----------- | -------- | ------------- |
| id          | String   | cuid, PK      |
| name        | String   | unique        |
| description | String?  |               |
| buildingId  | String?  | FK → Building |
| isActive    | Boolean  | default: true |
| createdAt   | DateTime | auto          |
| updatedAt   | DateTime | auto          |

Relations: `building?`, `userAccess[]`, `deadlineRules[]`, `tastingSessions[]`, `signagePackets[]`

**TastingPeriod**

| Field     | Type    | Notes         |
| --------- | ------- | ------------- |
| id        | String  | cuid, PK      |
| name      | String  | unique        |
| sortOrder | Int     |               |
| isActive  | Boolean | default: true |

**DeadlineRule**

| Field           | Type     | Notes                                       |
| --------------- | -------- | ------------------------------------------- |
| id              | String   | cuid, PK                                    |
| locationId      | String   | FK → Location                               |
| tastingPeriodId | String   | FK → TastingPeriod                          |
| deadlineTime    | String   | HH:mm — tasting submission deadline         |
| packetDueTime   | String?  | HH:mm — when signed packet must be returned |
| tastingStart    | String?  | HH:mm — when tasting window opens           |
| tastingEnd      | String?  | HH:mm — when tasting window closes          |
| serviceStart    | String?  | HH:mm — when service begins                 |
| daysOfWeek      | Int[]    | 0=Sun..6=Sat, default: [1,2,3,4,5]          |
| isActive        | Boolean  | default: true                               |
| createdAt       | DateTime | auto                                        |
| updatedAt       | DateTime | auto                                        |

Unique: `[locationId, tastingPeriodId]`

**RatingSchema**

| Field     | Type     | Notes         |
| --------- | -------- | ------------- |
| id        | String   | cuid, PK      |
| name      | String   |               |
| version   | Int      | default: 1    |
| isActive  | Boolean  | default: true |
| createdAt | DateTime | auto          |

**RatingQuestion**

| Field       | Type     | Notes                            |
| ----------- | -------- | -------------------------------- |
| id          | String   | cuid, PK                         |
| schemaId    | String   | FK → RatingSchema                |
| label       | String   |                                  |
| description | String?  |                                  |
| type        | String   | `"star"` / `"select"` / `"text"` |
| scaleMin    | Int?     | For star type                    |
| scaleMax    | Int?     | For star type                    |
| options     | String[] | Array, default: []               |
| isRequired  | Boolean  | default: true                    |
| sortOrder   | Int      |                                  |

### Tasting Capture

**TastingSession**

| Field                   | Type      | Notes                                   |
| ----------------------- | --------- | --------------------------------------- |
| id                      | String    | cuid, PK                                |
| date                    | DateTime  |                                         |
| locationId              | String    | FK → Location                           |
| tastingPeriodId         | String    | FK → TastingPeriod                      |
| chefId                  | String    | FK → User                               |
| managerName             | String?   |                                         |
| menuName                | String?   |                                         |
| status                  | String    | `draft`/`submitted`/`reviewed`/`locked` |
| checklistMenuPackage    | Boolean   | default: false                          |
| checklistDigitalSignage | Boolean   | default: false                          |
| checklistFoodCards      | Boolean   | default: false                          |
| checklistNotes          | String?   |                                         |
| submittedAt             | DateTime? |                                         |
| createdAt               | DateTime  | auto                                    |
| updatedAt               | DateTime  | auto                                    |

Unique: `[date, locationId, tastingPeriodId, chefId]`

**TastingItem**

| Field                 | Type    | Notes                                     |
| --------------------- | ------- | ----------------------------------------- |
| id                    | String  | cuid, PK                                  |
| sessionId             | String  | FK → TastingSession (cascade delete)      |
| dishName              | String  |                                           |
| sortOrder             | Int     |                                           |
| temperatureCompliance | String  | `compliant`/`non_compliant`/`not_checked` |
| adjustmentsNeeded     | String? |                                           |
| ranOutTime            | String? |                                           |
| serviceGapMins        | Int?    |                                           |
| backupNotes           | String? |                                           |
| fteNotes              | String? |                                           |
| photoUrl              | String? |                                           |

**RatingResponse**

| Field        | Type    | Notes                             |
| ------------ | ------- | --------------------------------- |
| id           | String  | cuid, PK                          |
| itemId       | String  | FK → TastingItem (cascade delete) |
| questionId   | String  | FK → RatingQuestion               |
| numericValue | Float?  |                                   |
| textValue    | String? |                                   |

Unique: `[itemId, questionId]`

**MenuSignagePacket**

| Field                   | Type      | Notes                                                          |
| ----------------------- | --------- | -------------------------------------------------------------- |
| id                      | String    | cuid, PK                                                       |
| date                    | DateTime  |                                                                |
| locationId              | String    | FK → Location                                                  |
| meal                    | String    |                                                                |
| theme                   | String?   | Packet-wide theme                                              |
| status                  | String    | `draft`/`published`/`for_final_review`/`finalized_for_service` |
| checklistMenuPackage    | Boolean   | default: false                                                 |
| checklistDigitalSignage | Boolean   | default: false                                                 |
| checklistFoodCards      | Boolean   | default: false                                                 |
| checklistNotes          | String?   |                                                                |
| backupReady             | Boolean   | default: false                                                 |
| backupUsed              | Boolean   | default: false                                                 |
| backupNotes             | String?   |                                                                |
| createdById             | String    | FK → User                                                      |
| assignedChefId          | String?   | FK → User                                                      |
| publishedById           | String?   | FK → User                                                      |
| publishedAt             | DateTime? |                                                                |
| readyForFinalReviewById | String?   | FK → User                                                      |
| readyForFinalReviewAt   | DateTime? |                                                                |
| finalizedForServiceById | String?   | FK → User                                                      |
| finalizedForServiceAt   | DateTime? |                                                                |
| tastingSessionId        | String?   | FK → TastingSession (unique)                                   |

Unique: `[date, locationId, meal]`. Indexes: `[locationId, date]`, `[status]`

**MenuSignageItem**

| Field             | Type               | Notes                  |
| ----------------- | ------------------ | ---------------------- |
| id                | String             | cuid, PK               |
| packetId          | String             | FK → MenuSignagePacket |
| category          | PacketItemCategory | enum                   |
| itemName          | String             |                        |
| ingredients       | String             |                        |
| theme             | String?            |                        |
| dietTags          | String[]           | Tag array              |
| allergenTags      | String[]           | Tag array              |
| sortOrder         | Int                |                        |
| isReadyForService | Boolean            | default: false         |
| wasUsed           | Boolean            | default: false         |
| notes             | String?            |                        |

**PacketReviewSignature**

| Field           | Type     | Notes                  |
| --------------- | -------- | ---------------------- |
| id              | String   | cuid, PK               |
| packetId        | String   | FK → MenuSignagePacket |
| signerId        | String   | FK → User              |
| signerNameInput | String   | Typed signature name   |
| signerRole      | String   | Role at sign time      |
| createdAt       | DateTime | auto                   |

Unique: `[packetId, signerId]`

**PacketAmendment**

| Field         | Type      | Notes                                                                |
| ------------- | --------- | -------------------------------------------------------------------- |
| id            | String    | cuid, PK                                                             |
| packetId      | String    | FK → MenuSignagePacket (cascade delete)                              |
| type          | String    | `item_change` / `backup_swap` / `item_removed` / `item_added`        |
| reason        | String    | `tasting_feedback` / `prep_change` / `service_change` / `correction` |
| description   | String    |                                                                      |
| itemId        | String?   | FK → MenuSignageItem (set null on delete)                            |
| requestedById | String    | FK → User                                                            |
| resolvedById  | String?   | FK → User                                                            |
| status        | String    | `pending` / `applied` / `dismissed`                                  |
| resolvedAt    | DateTime? |                                                                      |
| createdAt     | DateTime  | auto                                                                 |

Indexes: `[packetId, status]`, `[packetId, createdAt]`

**PacketItemCategory** enum: `entree`, `vegetarian_entree`, `vegan_entree`, `starches`, `vegetables`, `sides`, `pastry`, `back_up`

### Review Compliance

**ReviewAction**

| Field      | Type     | Notes                                |
| ---------- | -------- | ------------------------------------ |
| id         | String   | cuid, PK                             |
| sessionId  | String   | FK → TastingSession (cascade delete) |
| reviewerId | String   | FK → User                            |
| fromStatus | String   |                                      |
| toStatus   | String   |                                      |
| notes      | String?  |                                      |
| createdAt  | DateTime | auto                                 |

### Cross-cutting

**AuditEvent**

| Field      | Type     | Notes     |
| ---------- | -------- | --------- |
| id         | String   | cuid, PK  |
| entityType | String   |           |
| entityId   | String   |           |
| action     | String   |           |
| actorId    | String   | FK → User |
| actorName  | String   |           |
| fieldName  | String?  |           |
| oldValue   | String?  |           |
| newValue   | String?  |           |
| metadata   | Json?    |           |
| createdAt  | DateTime | auto      |

Indexes: `[entityType, entityId]`, `[actorId]`, `[createdAt]`

**NotificationEvent**

| Field             | Type      | Notes                          |
| ----------------- | --------- | ------------------------------ |
| id                | String    | cuid, PK                       |
| type              | String    |                                |
| recipientId       | String    | FK → User                      |
| channel           | String    | `in_app`/`email`/`google_chat` |
| subject           | String    |                                |
| body              | String    |                                |
| status            | String    | `pending`/`sent`/`failed`      |
| relatedEntityType | String?   |                                |
| relatedEntityId   | String?   |                                |
| sentAt            | DateTime? |                                |
| createdAt         | DateTime  | auto                           |

Indexes: `[recipientId, status]`, `[createdAt]`

**PushSubscription**

| Field     | Type     | Notes                      |
| --------- | -------- | -------------------------- |
| id        | String   | cuid, PK                   |
| userId    | String   | FK → User (cascade delete) |
| endpoint  | String   | unique                     |
| p256dh    | String   |                            |
| auth      | String   |                            |
| createdAt | DateTime | auto                       |

Index: `[userId]`

**ExportJob**

| Field         | Type      | Notes                                                 |
| ------------- | --------- | ----------------------------------------------------- |
| id            | String    | cuid, PK                                              |
| type          | String    | `compliance_summary`/`detail_export`/`trend_analysis` |
| format        | String    | `csv`/`pdf`                                           |
| filters       | Json      | default: {}                                           |
| requestedById | String    | FK → User                                             |
| status        | String    | `queued`/`processing`/`completed`/`failed`            |
| fileUrl       | String?   |                                                       |
| createdAt     | DateTime  | auto                                                  |
| completedAt   | DateTime? |                                                       |

---

## Module Type Signatures

Source: `src/modules/*/types.ts`

### tasting-capture

```typescript
type SessionStatus = "draft" | "submitted" | "reviewed" | "locked";
type TemperatureCompliance = "compliant" | "non_compliant" | "not_checked";

interface TastingSession { id, date, locationId, tastingPeriodId, chefId, managerName?, menuName?, status, checklist*, submittedAt?, timestamps, items[] }
interface TastingItem { id, sessionId, dishName, sortOrder, temperatureCompliance, adjustmentsNeeded?, ranOutTime?, serviceGapMins?, backupNotes?, fteNotes?, photoUrl?, ratings[] }
interface RatingResponse { id, itemId, questionId, numericValue?, textValue? }

interface CreateTastingSessionInput { date, locationId, tastingPeriodId, menuSignagePacketId?, managerName?, menuName?, checklist*, items: CreateTastingItemInput[] }
interface CreateTastingItemInput { dishName, sortOrder, temperatureCompliance, adjustmentsNeeded?, ranOutTime?, serviceGapMins?, backupNotes?, fteNotes?, ratings: CreateRatingResponseInput[] }
interface CreateRatingResponseInput { questionId, numericValue?, textValue? }
interface UpdateTastingSessionInput { menuSignagePacketId?, managerName?, menuName?, checklist*, items? }
```

### review-compliance

```typescript
interface ReviewAction {
  id;
  sessionId;
  reviewerId;
  fromStatus;
  toStatus;
  notes?;
  createdAt;
}
interface ComplianceSummary {
  locationId;
  locationName;
  date;
  periodId;
  periodName;
  totalExpected;
  totalSubmitted;
  totalReviewed;
  totalLate;
  totalMissing;
  complianceRate;
}
interface ReviewFilters {
  dateFrom?;
  dateTo?;
  locationId?;
  chefId?;
  periodId?;
  status?;
}
interface TransitionSessionInput {
  sessionId;
  toStatus: SessionStatus;
  notes?;
}
```

Valid session transitions: `draft→submitted`, `submitted→reviewed`, `submitted→locked`, `reviewed→locked`. Unlock: `locked→submitted` (via `unlockSession`).

### identity-access

```typescript
interface User { id, email, name, role, roleSubtypeId?, roleLabel?, locationIds[], isActive, timestamps }
interface SessionUser { id, email, name, role, roleSubtypeId?, roleLabel?, locationIds[], permissionKeys[] }
interface EffectiveUserContext { id, email, name, role, roleSubtypeId, roleLabel, locationIds[], permissionKeys[] }
interface CreateUserInput { email, name, password, role, roleSubtypeId?, roleLabel?, locationIds[] }
interface PermissionOverrideInput { permissionKey: PermissionKey, isAllowed: boolean }
interface KitchenAdminManagerAssignment { id, managerId, kitchenAdminId, createdAt }
```

### configuration

```typescript
interface Location { id, name, description?, isActive, timestamps }
interface TastingPeriod { id, name, sortOrder, isActive }
interface DeadlineRule { id, locationId, tastingPeriodId, deadlineTime (HH:mm), daysOfWeek[], isActive }
interface RatingSchema { id, name, version, isActive, questions[], createdAt }
interface RatingQuestion { id, schemaId, label, description?, type, scaleMin?, scaleMax?, options?, isRequired, sortOrder }
```

### menu-signage

```typescript
interface CreateMenuSignageItemInput { category, itemName, ingredients, dietTags?, allergenTags?, sortOrder, isReadyForService?, wasUsed?, notes? }
interface CreateMenuSignagePacketInput { date, locationId, meal, theme?, status?, assignedChefId?, checklist*, backup*, tastingSessionId?, items[] }
interface UpdateMenuSignagePacketStructureInput { date?, locationId?, meal?, theme?, status?, assignedChefId?, tastingSessionId?, items? }
interface UpdateMenuSignagePacketExecutionInput { status?, checklist*, backup*, itemExecution?: { id, isReadyForService?, wasUsed?, notes? }[] }
interface AddPacketSignatureInput { typedName, acknowledged }
interface PublishMenuSignagePacketInput { note? }
interface SubmitPacketForFinalReviewInput { note? }
interface FinalizePacketForServiceInput { typedName, acknowledged, note? }
interface MenuSignageFilters { dateFrom?, dateTo?, locationId?, meal?, status?, assignedChefId? }
```

### events

```typescript
type DomainEventType =
  | "session_created"
  | "session_submitted"
  | "session_edited_post_submit"
  | "session_reviewed"
  | "session_locked"
  | "session_unlocked"
  | "deadline_missed"
  | "item_photo_uploaded"
  | "config_updated";

interface DomainEvent<T> {
  id;
  type;
  timestamp;
  actorId;
  entityId;
  entityType;
  payload: T;
  metadata?;
}
type EventHandler<T> = (event: DomainEvent<T>) => Promise<void>;
interface EventSubscription {
  eventType;
  handler;
  module: string;
}
```

### notifications

```typescript
type NotificationChannel = "email" | "google_chat" | "in_app";
type NotificationStatus = "pending" | "sent" | "failed";
interface NotificationEvent {
  id;
  type;
  recipientId;
  channel;
  subject;
  body;
  status;
  relatedEntityType?;
  relatedEntityId?;
  sentAt?;
  createdAt;
}
interface SendNotificationInput {
  type;
  recipientId;
  channel;
  subject;
  body;
  relatedEntityType?;
  relatedEntityId?;
}
```

### audit

```typescript
interface AuditEvent {
  id;
  entityType;
  entityId;
  action;
  actorId;
  actorName;
  fieldName?;
  oldValue?;
  newValue?;
  metadata?;
  createdAt;
}
interface CreateAuditEventInput {
  entityType;
  entityId;
  action;
  actorId;
  actorName;
  fieldName?;
  oldValue?;
  newValue?;
  metadata?;
}
interface FieldDiff {
  fieldName;
  oldValue?;
  newValue?;
}
// diffPacketStructure(oldPacket, newInput) => FieldDiff[] — used by structure update handler to record field-level changes in audit metadata.changes
```

### media

```typescript
interface UploadResult {
  storageKey;
  url;
  fileName;
  fileSize;
  fileType;
}
```

---

## Zod Validation Schemas

Source: `src/lib/validations.ts`

All API request bodies are validated through these schemas via `.safeParse()`.

| Schema Name                              | Used By Route                                             | Key Constraints                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loginSchema`                            | NextAuth                                                  | email: valid email, password: min 6 chars                                                                                                          |
| `createUserSchema`                       | (seed/admin)                                              | email, name min 1, password min 6, role enum, locationIds min 1                                                                                    |
| `createLocationSchema`                   | `POST /api/config/locations`                              | name min 1, description optional                                                                                                                   |
| `createTastingPeriodSchema`              | `POST /api/config/periods`                                | name min 1, sortOrder int >= 0                                                                                                                     |
| `createDeadlineRuleSchema`               | `POST /api/config/deadlines`                              | deadlineTime HH:mm regex, daysOfWeek 0-6 min 1                                                                                                     |
| `createRatingSchemaInput`                | `POST /api/config/schema`                                 | name min 1, questions array with type enum                                                                                                         |
| `ratingResponseSchema`                   | (nested in tastingItemSchema)                             | questionId min 1, numericValue? textValue?                                                                                                         |
| `tastingItemSchema`                      | (nested in session schemas)                               | dishName min 1, temperatureCompliance enum, ratings[]                                                                                              |
| `createTastingSessionSchema`             | `POST /api/tastings`                                      | date, locationId, tastingPeriodId, items min 1                                                                                                     |
| `updateTastingSessionSchema`             | `PATCH /api/tastings/[id]`                                | All fields optional, items optional                                                                                                                |
| `transitionSessionSchema`                | `POST /api/reviews`                                       | sessionId, toStatus enum, notes?                                                                                                                   |
| `reviewFiltersSchema`                    | (query parsing)                                           | All fields optional, status enum                                                                                                                   |
| `replaceSubtypePermissionsSchema`        | `PATCH /api/identity/rbac/subtypes/[id]`                  | permissionKeys[] validated against catalog                                                                                                         |
| `updateUserPermissionsSchema`            | `PATCH /api/identity/rbac/users/[id]`                     | role? enum, roleSubtypeId?, managedKitchenAdminIds?, overrides?[]                                                                                  |
| `menuPacketItemSchema`                   | (nested in packet schemas)                                | category enum, itemName min 1, ingredients min 1                                                                                                   |
| `createMenuSignagePacketSchema`          | `POST /api/packets`                                       | date, locationId, meal, items min 1                                                                                                                |
| `updateMenuSignagePacketStructureSchema` | `PATCH /api/packets/[id]` (mode: structure)               | All fields optional                                                                                                                                |
| `updateMenuSignagePacketExecutionSchema` | `PATCH /api/packets/[id]` (mode: execution)               | checklist booleans, itemExecution[]                                                                                                                |
| `addPacketSignatureSchema`               | `PATCH /api/packets/[id]` (mode: add_signature)           | typedName, acknowledged=true                                                                                                                       |
| `publishMenuSignagePacketSchema`         | `PATCH /api/packets/[id]` (mode: publish)                 | optional note                                                                                                                                      |
| `submitPacketForFinalReviewSchema`       | `PATCH /api/packets/[id]` (mode: submit_for_final_review) | optional note                                                                                                                                      |
| `finalizePacketForServiceSchema`         | `PATCH /api/packets/[id]` (mode: finalize_for_service)    | typedName, acknowledged=true, optional note                                                                                                        |
| `updateMenuSignagePacketSchema`          | `PATCH /api/packets/[id]`                                 | Discriminated union on `mode`: `"structure"`, `"execution"`, `"publish"`, `"submit_for_final_review"`, `"add_signature"`, `"finalize_for_service"` |

---

## API Route Reference

All routes require authentication via `requireAuth()`. Permission requirements are noted.

### Tastings

| Method | Route                | Permission                                               | Request Schema                                                | Response               |
| ------ | -------------------- | -------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| GET    | `/api/tastings`      | `tastings.view_all` or `tastings.create`/`edit`/`submit` | Query: dateFrom, dateTo, locationId, chefId, periodId, status | `TastingSession[]`     |
| POST   | `/api/tastings`      | `tastings.create`                                        | `createTastingSessionSchema`                                  | `TastingSession` (201) |
| GET    | `/api/tastings/[id]` | view_all or owner                                        | —                                                             | `TastingSession`       |
| PATCH  | `/api/tastings/[id]` | `tastings.edit` or `tastings.submit`                     | `updateTastingSessionSchema` or `{ action: "submit" }`        | `TastingSession`       |

### Reviews

| Method | Route               | Permission       | Request Schema            | Response         |
| ------ | ------------------- | ---------------- | ------------------------- | ---------------- |
| POST   | `/api/reviews`      | `reviews.manage` | `transitionSessionSchema` | `TastingSession` |
| GET    | `/api/reviews/[id]` | `reviews.manage` | —                         | `AuditEvent[]`   |
| POST   | `/api/reviews/[id]` | `reviews.unlock` | `{ action: "unlock" }`    | `TastingSession` |

### Packets

| Method | Route                       | Permission                                                                                                     | Request Schema                                                    | Response                  |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------- |
| GET    | `/api/packets`              | `packets.read`                                                                                                 | Query: dateFrom, dateTo, locationId, meal, status, assignedChefId | `MenuSignagePacket[]`     |
| POST   | `/api/packets`              | `packets.manage_structure`                                                                                     | `createMenuSignagePacketSchema`                                   | `MenuSignagePacket` (201) |
| GET    | `/api/packets/[id]`         | `packets.read` + location                                                                                      | —                                                                 | `MenuSignagePacket`       |
| PATCH  | `/api/packets/[id]`         | Depends on mode (`packets.manage_structure`, `packets.execute`, `packets.publish`, `packets.finalize_service`) | `updateMenuSignagePacketSchema`                                   | `MenuSignagePacket`       |
| DELETE | `/api/packets/[id]`         | `packets.manage_structure` or override                                                                         | —                                                                 | `{ success: true }`       |
| GET    | `/api/packets/[id]/history` | `packets.read` + location                                                                                      | —                                                                 | `AuditEvent[]`            |

### Configuration

| Method | Route                   | Permission      | Request Schema              | Response              |
| ------ | ----------------------- | --------------- | --------------------------- | --------------------- |
| GET    | `/api/config/locations` | (authenticated) | —                           | `Location[]`          |
| POST   | `/api/config/locations` | `config.manage` | `createLocationSchema`      | `Location` (201)      |
| GET    | `/api/config/periods`   | (authenticated) | —                           | `TastingPeriod[]`     |
| POST   | `/api/config/periods`   | `config.manage` | `createTastingPeriodSchema` | `TastingPeriod` (201) |
| GET    | `/api/config/deadlines` | (authenticated) | —                           | `DeadlineRule[]`      |
| POST   | `/api/config/deadlines` | `config.manage` | `createDeadlineRuleSchema`  | `DeadlineRule` (201)  |
| GET    | `/api/config/schema`    | (authenticated) | Query: all?                 | `RatingSchema`        |
| POST   | `/api/config/schema`    | `config.manage` | `createRatingSchemaInput`   | `RatingSchema` (201)  |

### Identity / RBAC

| Method | Route                                                        | Permission                                          | Request Schema                    | Response                                            |
| ------ | ------------------------------------------------------------ | --------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| GET    | `/api/identity/rbac`                                         | `permissions.manage`                                | —                                 | `{ permissions, subtypes, users }`                  |
| PATCH  | `/api/identity/rbac/subtypes/[id]`                           | `permissions.manage`                                | `replaceSubtypePermissionsSchema` | `RoleSubtype`                                       |
| PATCH  | `/api/identity/rbac/users/[id]`                              | `permissions.manage`                                | `updateUserPermissionsSchema`     | `EffectiveUserContext`                              |
| GET    | `/api/kitchen-admin-manager/team`                            | `kitchen_admins.manage` or `kitchen_admins.view_as` | Query: window, date               | `{ managedKitchenAdmins, managerLocations, range }` |
| PATCH  | `/api/kitchen-admin-manager/team/[kitchenAdminId]/locations` | `kitchen_admins.manage`                             | `replaceLocationAccessSchema`     | `{ kitchenAdminId, locations }`                     |

### Other

| Method | Route                | Permission           | Request Schema                                  | Response                         |
| ------ | -------------------- | -------------------- | ----------------------------------------------- | -------------------------------- |
| POST   | `/api/media`         | (authenticated)      | FormData: file (image, max 10MB)                | `UploadResult` (201)             |
| GET    | `/api/notifications` | `notifications.view` | —                                               | `{ notifications, unreadCount }` |
| GET    | `/api/reports`       | `reports.view`       | Query: type, dateFrom, dateTo, locationId, etc. | JSON or CSV download             |

---

## Domain Events

Source: `src/modules/events/types.ts`

| Event Type                   | Published By                | Payload Shape                         |
| ---------------------------- | --------------------------- | ------------------------------------- |
| `session_created`            | `tasting-capture/service`   | `{ sessionId }`                       |
| `session_submitted`          | `tasting-capture/service`   | `{ sessionId }`                       |
| `session_edited_post_submit` | `tasting-capture/service`   | `{ sessionId, previousStatus }`       |
| `session_reviewed`           | `review-compliance/service` | `{ sessionId, fromStatus, toStatus }` |
| `session_locked`             | `review-compliance/service` | `{ sessionId, fromStatus, toStatus }` |
| `session_unlocked`           | `review-compliance/service` | `{ sessionId }`                       |
| `deadline_missed`            | `scripts/check-deadlines`   | `{ locationName?, periodName? }`      |
| `item_photo_uploaded`        | (not yet published)         | —                                     |
| `config_updated`             | (not yet published)         | —                                     |
