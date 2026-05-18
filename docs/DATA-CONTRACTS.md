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

Relations include `locationAccess[]`, `roleSubtype?`, `permissionRules[]`, `tastingSessions[]`, `reviewActions[]`, `auditEvents[]`, `notifications[]`, `exportJobs[]`, menu packet roles, count sheet submit/amend roles, AI reports/sessions, and operational audit submit/upload/resolve roles.

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

Relations: `building?`, `userAccess[]`, `deadlineRules[]`, `tastingSessions[]`, `signagePackets[]`, `countSheetTemplates[]`, `operationalAudits[]`

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

### Daily Counts

**CountSheetTemplate**

| Field           | Type     | Notes               |
| --------------- | -------- | ------------------- |
| id              | String   | cuid, PK            |
| locationId      | String   | FK -> Location      |
| tastingPeriodId | String   | FK -> TastingPeriod |
| isActive        | Boolean  | default: true       |
| createdAt       | DateTime | auto                |
| updatedAt       | DateTime | auto                |

Unique: `[locationId, tastingPeriodId]`. Relations: `sections[]`, `sheets[]`

**CountSheetSection**

| Field      | Type    | Notes                                              |
| ---------- | ------- | -------------------------------------------------- |
| id         | String  | cuid, PK                                           |
| templateId | String  | FK -> CountSheetTemplate                           |
| label      | String  |                                                    |
| group      | String? | Optional reporting group                           |
| fields     | Json    | Field definitions: key, label, type, optional role |
| sortOrder  | Int     |                                                    |
| isActive   | Boolean | default: true                                      |

Unique: `[templateId, sortOrder]`

**DailyCountSheet**

| Field         | Type             | Notes                    |
| ------------- | ---------------- | ------------------------ |
| id            | String           | cuid, PK                 |
| templateId    | String           | FK -> CountSheetTemplate |
| date          | DateTime         | `@db.Date`               |
| status        | CountSheetStatus | `draft` / `submitted`    |
| submittedById | String?          | FK -> User               |
| submittedAt   | DateTime?        |                          |
| amendedById   | String?          | FK -> User               |
| amendedAt     | DateTime?        |                          |
| amendReason   | String?          | Latest amendment reason  |
| notes         | String?          |                          |
| createdAt     | DateTime         | auto                     |
| updatedAt     | DateTime         | auto                     |

Unique: `[templateId, date]`. Indexes: `[date]`

**DailyCountEntry**

| Field     | Type   | Notes                   |
| --------- | ------ | ----------------------- |
| id        | String | cuid, PK                |
| sheetId   | String | FK -> DailyCountSheet   |
| sectionId | String | FK -> CountSheetSection |
| values    | Json   | default: `{}`           |

Unique: `[sheetId, sectionId]`

**CountSheetStatus** enum: `draft`, `submitted`

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

### AI Agents

**AiChatSession**

| Field     | Type     | Notes                          |
| --------- | -------- | ------------------------------ |
| id        | String   | cuid, PK                       |
| userId    | String   | FK -> User                     |
| title     | String?  | Generated or user-facing title |
| createdAt | DateTime | auto                           |
| updatedAt | DateTime | auto                           |

Relations: `messages[]`

**AiChatMessage**

| Field     | Type     | Notes                |
| --------- | -------- | -------------------- |
| id        | String   | cuid, PK             |
| sessionId | String   | FK -> AiChatSession  |
| role      | String   | `user` / `model`     |
| content   | String   |                      |
| metadata  | Json?    | e.g. `{ agentUsed }` |
| createdAt | DateTime | auto                 |

Index: `[sessionId]`

**AiInsightReport**

| Field       | Type     | Notes                                                     |
| ----------- | -------- | --------------------------------------------------------- |
| id          | String   | cuid, PK                                                  |
| type        | String   | `tasting_analysis` / `menu_review` / `compliance_summary` |
| entityId    | String?  | Optional target entity                                    |
| entityType  | String?  | Optional target entity type                               |
| content     | String   | Generated report markdown/text                            |
| metadata    | Json?    | Prompt/agent metadata                                     |
| generatedBy | String   | FK -> User                                                |
| createdAt   | DateTime | auto                                                      |

Index: `[generatedBy]`

### Operational Compliance

**OperationalAudit**

| Field            | Type     | Notes                                                  |
| ---------------- | -------- | ------------------------------------------------------ |
| id               | String   | cuid, PK                                               |
| type             | String   | `closing` / `temperature_log`                          |
| locationId       | String   | FK -> Location                                         |
| auditDate        | DateTime | `@db.Date`                                             |
| submittedById    | String   | FK -> User                                             |
| status           | String   | `processing` / `completed` / `needs_review` / `failed` |
| summary          | String?  | AI-assisted summary                                    |
| ruleSet          | Json     | Stored rule defaults                                   |
| metadata         | Json     | Analysis metadata                                      |
| modelName        | String?  | Gemini model used                                      |
| promptVersion    | String   | Prompt version stored with audit                       |
| schemaVersion    | String   | Extraction schema version                              |
| errorMessage     | String?  | Failure reason                                         |
| needsHumanReview | Boolean  | default: false                                         |
| createdAt        | DateTime | auto                                                   |
| updatedAt        | DateTime | auto                                                   |

Indexes: `[locationId, auditDate]`, `[type, status]`, `[submittedById]`

**OperationalAuditAsset**

| Field        | Type     | Notes                        |
| ------------ | -------- | ---------------------------- |
| id           | String   | cuid, PK                     |
| auditId      | String   | FK -> OperationalAudit       |
| bucket       | String   | Supabase bucket name         |
| storageKey   | String   | Private object key           |
| fileName     | String   | Original/generated file name |
| fileSize     | Int      | Bytes                        |
| fileType     | String   | MIME type                    |
| kind         | String   | `source` / `generated_pdf`   |
| uploadedById | String   | FK -> User                   |
| createdAt    | DateTime | auto                         |

Unique: `[bucket, storageKey]`. Indexes: `[auditId]`, `[uploadedById]`

**ClosingPhoto**

| Field            | Type     | Notes                                                    |
| ---------------- | -------- | -------------------------------------------------------- |
| id               | String   | cuid, PK                                                 |
| auditId          | String   | FK -> OperationalAudit                                   |
| assetId          | String?  | Optional FK -> OperationalAuditAsset, unique             |
| category         | String   | `station` / `line` / `walk_in` / `dish_area` / `storage` |
| cleanlinessScore | Float?   | AI-assisted score                                        |
| assessment       | String?  | AI-assisted assessment                                   |
| visibleFindings  | Json     | Findings array                                           |
| confidence       | Float?   | 0..1                                                     |
| createdAt        | DateTime | auto                                                     |

Index: `[auditId, category]`

**TemperatureLog**

| Field               | Type      | Notes                          |
| ------------------- | --------- | ------------------------------ |
| id                  | String    | cuid, PK                       |
| auditId             | String    | FK -> OperationalAudit, unique |
| sourceAssetId       | String?   | FK -> OperationalAuditAsset    |
| generatedPdfAssetId | String?   | FK -> OperationalAuditAsset    |
| extractedBy         | String?   | Model name                     |
| summary             | String?   | AI-assisted summary            |
| documentDate        | DateTime? | `@db.Date`                     |
| createdAt           | DateTime  | auto                           |
| updatedAt           | DateTime  | auto                           |

Indexes: `[sourceAssetId]`, `[generatedPdfAssetId]`

**TemperatureEntry**

| Field            | Type     | Notes                                            |
| ---------------- | -------- | ------------------------------------------------ |
| id               | String   | cuid, PK                                         |
| temperatureLogId | String   | FK -> TemperatureLog                             |
| entryTime        | String?  | Extracted timestamp                              |
| stationName      | String?  | Extracted station                                |
| itemName         | String?  | Extracted item                                   |
| holdingType      | String   | `hot` / `cold` / `unknown`                       |
| temperatureRaw   | String?  | Raw OCR value                                    |
| temperatureF     | Float?   | Normalized Fahrenheit                            |
| unit             | String?  | Extracted unit                                   |
| initials         | String?  | Extracted initials                               |
| notes            | String?  | Extracted notes                                  |
| confidence       | Float    | 0..1, default 0                                  |
| complianceStatus | String   | `compliant` / `potential_issue` / `needs_review` |
| createdAt        | DateTime | auto                                             |

Indexes: `[temperatureLogId]`, `[complianceStatus]`

**ComplianceIssue**

| Field              | Type      | Notes                                              |
| ------------------ | --------- | -------------------------------------------------- |
| id                 | String    | cuid, PK                                           |
| auditId            | String    | FK -> OperationalAudit                             |
| closingPhotoId     | String?   | Optional FK -> ClosingPhoto                        |
| temperatureEntryId | String?   | Optional FK -> TemperatureEntry                    |
| severity           | String    | `low` / `medium` / `high`                          |
| status             | String    | `open` / `acknowledged` / `resolved` / `dismissed` |
| type               | String    | Issue type                                         |
| title              | String    | Must use AI-assisted/manager-review wording        |
| description        | String    |                                                    |
| recommendation     | String?   |                                                    |
| confidence         | Float?    | 0..1                                               |
| ruleCode           | String?   | e.g. `TEMP_LOW_CONFIDENCE`                         |
| resolvedById       | String?   | FK -> User                                         |
| resolvedAt         | DateTime? |                                                    |
| createdAt          | DateTime  | auto                                               |
| updatedAt          | DateTime  | auto                                               |

Indexes: `[auditId, status]`, `[severity, status]`, `[resolvedById]`

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

### daily-counts

```typescript
type FieldType = "number" | "text" | "time";
type FieldRole = "initial" | "addition" | "remainder" | "label";

interface FieldDefinition { key, label, type, role? }
interface SectionInput { label, group?, fields: FieldDefinition[], sortOrder }
interface UpsertTemplateInput { locationId, tastingPeriodId, sections[] }
interface EntryInput { sectionId, values: Record<string, string | number | null> }
interface SectionTotals { sectionId, label, group?, total, totalUsed }
interface GroupTotals { group, total }
interface SheetSummary { sectionTotals[], groupTotals[], grandTotal }
```

### ai-agents

```typescript
type AgentName = "tasting-intelligence" | "menu-review" | "ops-assistant";
type InsightType = "tasting_analysis" | "menu_review" | "compliance_summary";
interface ToolContext { user: EffectiveUserContext }
interface AiChatSession { id, userId, title?, timestamps, messages[] }
interface AiChatMessage { id, sessionId, role, content, metadata?, createdAt }
interface AiInsightReport { id, type, entityId?, entityType?, content, metadata?, generatedBy, createdAt }
```

### operational-compliance

```typescript
type ClosingPhotoCategory = "station" | "line" | "walk_in" | "dish_area" | "storage";
type AuditType = "closing" | "temperature_log";
type AuditStatus = "processing" | "completed" | "needs_review" | "failed";
type HoldingType = "hot" | "cold" | "unknown";
type ComplianceStatus = "compliant" | "potential_issue" | "needs_review";
type IssueSeverity = "low" | "medium" | "high";
type IssueStatus = "open" | "acknowledged" | "resolved" | "dismissed";

interface ComplianceRuleSet {
  version;
  source;
  coldMaxF;
  hotMinF;
  minConfidence;
}
interface ClosingPhotoUpload {
  category;
  file;
}
interface TemperatureEntryInput {
  entryTime?;
  stationName?;
  itemName?;
  holdingType;
  temperatureRaw?;
  temperatureF?;
  unit?;
  initials?;
  notes?;
  confidence;
}
interface IssueInput {
  severity;
  type;
  title;
  description;
  recommendation?;
  confidence?;
  ruleCode?;
}
```

---

## Zod Validation Schemas

Primary source: `src/lib/validations.ts`

Shared JSON request bodies are validated through these schemas via `.safeParse()`. Route-local Zod schemas are allowed for route-only actions, service-local Zod schemas are used for Gemini structured output validation, and `FormData` upload routes validate fields/files manually plus service-level file constraints.

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
| `fieldDefinitionSchema`                  | Daily count template schemas                              | key lowercase alphanumeric/underscore, label, type enum, optional role enum                                                                        |
| `upsertCountSheetTemplateSchema`         | `POST /api/daily-counts/templates`                        | locationId, tastingPeriodId, sections min 1, field keys unique per section                                                                         |
| `updateCountEntriesSchema`               | `PATCH /api/daily-counts/sheets/[id]`                     | entries array of `{ sectionId, values }`                                                                                                           |
| `amendCountSheetSchema`                  | `POST /api/daily-counts/sheets/[id]/amend`                | reason min 1, entries array                                                                                                                        |

Additional route-local/service-local validation:

| Schema / Validation              | Used By                                                     | Key Constraints                                                                       |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `chatRequestSchema`              | `POST /api/ai/chat`                                         | message 1-2000 chars, optional/null sessionId                                         |
| `insightRequestSchema`           | `POST /api/ai/insights`                                     | type enum: `tasting_analysis`, `menu_review`, `compliance_summary`; optional entityId |
| `updateIssueSchema`              | `PATCH /api/operational-audits/issues/[issueId]`            | status enum: `open`, `acknowledged`, `resolved`, `dismissed`                          |
| Closing audit `FormData`         | `POST /api/operational-audits/closing`                      | `locationId`, optional/defaulted `auditDate`, at least one category file              |
| Temperature log `FormData`       | `POST /api/operational-audits/temperature-logs`             | `locationId`, optional/defaulted `auditDate`, required `file`                         |
| Operational file validation      | `operational-compliance/service.ts`                         | JPG/PNG/WebP/PDF, max 20MB                                                            |
| Gemini structured output schemas | `operational-compliance/service.ts` and `src/lib/gemini.ts` | JSON schema response, Zod validation, one repair pass                                 |

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

### Daily Counts

All daily count routes require authentication and enforce location access in the route handler. Users with `config.manage` can act across locations.

| Method | Route                                  | Permission                                             | Request Schema / Params                  | Response / Behavior                                                                               |
| ------ | -------------------------------------- | ------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/daily-counts/templates`          | `counts.record` or `counts.configure` or `counts.view` | Query: `locationId`, `periodId` required | `CountSheetTemplate \| null`; 400 if query missing                                                |
| POST   | `/api/daily-counts/templates`          | `counts.configure`                                     | `upsertCountSheetTemplateSchema`         | `CountSheetTemplate` (201), creates generic `AuditEvent`                                          |
| GET    | `/api/daily-counts/templates/[id]`     | `counts.record` or `counts.configure` or `counts.view` | —                                        | `CountSheetTemplate` or 404                                                                       |
| DELETE | `/api/daily-counts/templates/[id]`     | `counts.configure`                                     | —                                        | `{ success: true }`, soft-deactivates template, creates generic `AuditEvent`                      |
| GET    | `/api/daily-counts/sheets`             | `counts.view` or `counts.record`                       | Query: optional `dateFrom`, `dateTo`     | `DailyCountSheet[]` with `summary`                                                                |
| POST   | `/api/daily-counts/sheets`             | `counts.record`                                        | JSON: `templateId`, `date`               | `DailyCountSheet` (201), creates or returns dated sheet, creates generic `AuditEvent`             |
| GET    | `/api/daily-counts/sheets/[id]`        | Authenticated + location scope                         | —                                        | `DailyCountSheet` with `summary`                                                                  |
| PATCH  | `/api/daily-counts/sheets/[id]`        | `counts.record`                                        | `updateCountEntriesSchema`               | Updated draft sheet with `summary`, creates generic `AuditEvent`; submitted sheets must use amend |
| POST   | `/api/daily-counts/sheets/[id]/submit` | `counts.record`                                        | —                                        | Submitted sheet, creates generic `AuditEvent`                                                     |
| POST   | `/api/daily-counts/sheets/[id]/amend`  | `counts.record`                                        | `amendCountSheetSchema`                  | Amended submitted sheet with `summary`, creates generic `AuditEvent`                              |

### AI Agents

AI API routes require authenticated users with role `fte` or `ops`. This is role-based in the route code; the current sidebar exposes `/ops/ai-assistant` by `reports.view`, so the UI permission and API role gate are not identical.

| Method | Route                   | Permission / Role             | Request Schema / Params                                              | Response / Behavior                                                       |
| ------ | ----------------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| POST   | `/api/ai/chat`          | role `fte` or `ops`           | `chatRequestSchema`: message 1-2000 chars, optional/null `sessionId` | Server-sent event stream; creates session if needed and persists messages |
| GET    | `/api/ai/sessions`      | role `fte` or `ops`           | —                                                                    | Current user's chat sessions                                              |
| POST   | `/api/ai/sessions`      | role `fte` or `ops`           | —                                                                    | New `AiChatSession` (201)                                                 |
| GET    | `/api/ai/sessions/[id]` | role `fte` or `ops` and owner | —                                                                    | One chat session with messages, or 404                                    |
| POST   | `/api/ai/insights`      | role `fte` or `ops`           | `insightRequestSchema`                                               | `AiInsightReport` (201); 500 on AI service error                          |
| GET    | `/api/ai/insights`      | role `fte` or `ops`           | Query: optional `type`                                               | Current user's reports                                                    |

`POST /api/ai/chat` SSE event `type` values:

| Type         | Payload                          |
| ------------ | -------------------------------- |
| `session`    | `{ type: "session", sessionId }` |
| `agent`      | `{ type: "agent", agent }`       |
| `text`       | `{ type: "text", text }`         |
| `tool_calls` | `{ type: "tool_calls", tools }`  |
| `done`       | `{ type: "done", agentUsed }`    |
| `error`      | `{ type: "error", error }`       |

### Operational Audits

All operational audit routes require authentication. The service enforces permission and location scope.

| Method | Route                                                 | Permission / Scope                                                                          | Request Shape                                                                                                                                    | Response / Error Behavior                                                                                                                                          |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/operational-audits`                             | `compliance.view` or `compliance.manage`; scoped to locations unless broad access           | Query: optional `locationId`, `dateFrom`, `dateTo`, `type`, `status`                                                                             | Up to 100 audits with counts; forbidden location filters return empty scoped results                                                                               |
| POST   | `/api/operational-audits/closing`                     | `compliance.record` for location                                                            | `FormData`: `locationId`, optional/defaulted `auditDate`, category files `station`, `line`, `walk_in`, `dish_area`, `storage`; at least one file | `OperationalAuditDetail` (201). File/AI/storage failures after audit creation mark audit `failed` and return audit detail                                          |
| POST   | `/api/operational-audits/temperature-logs`            | `compliance.record` for location                                                            | `FormData`: `locationId`, optional/defaulted `auditDate`, required `file`                                                                        | `OperationalAuditDetail` (201). File/AI/storage failures after audit creation mark audit `failed` and return audit detail                                          |
| GET    | `/api/operational-audits/[id]`                        | `compliance.view`/`manage`, or `compliance.record` for own submitted audit; location-scoped | —                                                                                                                                                | `OperationalAuditDetail`                                                                                                                                           |
| POST   | `/api/operational-audits/[id]/reanalyze`              | `compliance.manage` for location                                                            | —                                                                                                                                                | Reanalyzed `OperationalAuditDetail` (201). Source assets retained; derived findings/log rows regenerated; temperature reanalysis creates a new generated PDF asset |
| GET    | `/api/operational-audits/assets/[assetId]/signed-url` | Same read scope as parent audit                                                             | —                                                                                                                                                | `{ url, expiresIn: 300 }`                                                                                                                                          |
| PATCH  | `/api/operational-audits/issues/[issueId]`            | `compliance.manage` for location                                                            | `{ status: "open" \| "acknowledged" \| "resolved" \| "dismissed" }`                                                                              | Updated `ComplianceIssue`; sets resolver/time for `resolved` and `dismissed`                                                                                       |

Operational file constraints: backend allows `image/jpeg`, `image/png`, `image/webp`, and `application/pdf` up to 20MB. Current closing UI selects images, but backend validation also allows PDFs.

Operational storage: source and generated PDF assets live in private Supabase bucket `operational-audit-assets`. Server code uses the Supabase service role key and returns short-lived signed URLs after app-level checks; do not describe this as Supabase RLS enforcement.

Gemini analysis: PDFs and files over 7MB use Gemini Files API; small images use inline base64. No Gemini Files API cleanup/delete path is currently implemented.

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

No domain events are currently emitted by `ai-agents`, `daily-counts`, or `operational-compliance`. Daily count API routes create generic `AuditEvent` records directly. Operational compliance stores module-owned audit/evidence/issue records and does not currently create generic `AuditEvent` rows.
