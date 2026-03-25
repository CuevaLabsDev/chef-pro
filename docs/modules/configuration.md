# Module: configuration

**Path:** `src/modules/configuration/`
**Purpose:** CRUD for system configuration: campuses, buildings, locations, tasting periods, deadline rules, and rating schemas.

## Files

| File              | Role                             |
| ----------------- | -------------------------------- |
| `service.ts`      | All configuration CRUD functions |
| `types.ts`        | Configuration entity types       |
| `service.test.ts` | Unit tests (11 tests)            |

## Dependencies

- `@/lib/db` (Prisma)

## Service Exports

### Campuses

| Function                 | Returns                                     |
| ------------------------ | ------------------------------------------- |
| `getCampuses()`          | Campuses with nested buildings -> locations |
| `getCampusById(id)`      | Single campus with hierarchy                |
| `createCampus(name)`     | Created campus                              |
| `updateCampus(id, data)` | Updated campus                              |

### Buildings

| Function                   | Returns               |
| -------------------------- | --------------------- |
| `getBuildings()`           | Buildings with campus |
| `getBuildingById(id)`      | Single building       |
| `createBuilding(input)`    | Created building      |
| `updateBuilding(id, data)` | Updated building      |

### Locations

| Function                         | Returns                                             |
| -------------------------------- | --------------------------------------------------- |
| `getLocations()`                 | Active locations                                    |
| `getLocationById(id)`            | Single location                                     |
| `getLocationDetail(id)`          | Location with building, campus, user access, counts |
| `getLocationsWithManagerCount()` | Locations with access counts                        |
| `createLocation(input)`          | Created location                                    |
| `updateLocation(id, data)`       | Updated location                                    |

### Tasting Periods

| Function                        | Returns              |
| ------------------------------- | -------------------- |
| `getTastingPeriods()`           | Periods by sortOrder |
| `createTastingPeriod(input)`    | Created period       |
| `updateTastingPeriod(id, data)` | Updated period       |

### Deadline Rules

| Function                       | Returns                      |
| ------------------------------ | ---------------------------- |
| `getDeadlineRules()`           | Rules with location + period |
| `createDeadlineRule(input)`    | Created rule                 |
| `updateDeadlineRule(id, data)` | Updated rule                 |

### Rating Schemas

| Function                    | Returns                             |
| --------------------------- | ----------------------------------- |
| `getActiveRatingSchema()`   | Latest active schema with questions |
| `getRatingSchemas()`        | All schemas with questions          |
| `createRatingSchema(input)` | New schema (deactivates previous)   |

## Behavior Rules

1. **Soft delete**: Use `isActive: false` via `updateCampus/Building/Location/Period`. Never hard-delete.
2. **Rating schema versioning**: Creating a new schema automatically deactivates the current active one.
3. **Deadline uniqueness**: One rule per `(locationId, tastingPeriodId)`.
4. **Hierarchy**: Campus -> Building -> Location. Deleting a campus cascades to buildings, buildings cascade to locations.

## API Routes

| Route                        | Methods            | Permission                    |
| ---------------------------- | ------------------ | ----------------------------- |
| `/api/config/campuses`       | GET, POST          | POST: `config.manage`         |
| `/api/config/campuses/[id]`  | GET, PATCH, DELETE | PATCH/DELETE: `config.manage` |
| `/api/config/buildings`      | GET, POST          | POST: `config.manage`         |
| `/api/config/buildings/[id]` | GET, PATCH, DELETE | PATCH/DELETE: `config.manage` |
| `/api/config/locations`      | GET, POST          | POST: `config.manage`         |
| `/api/config/locations/[id]` | GET, PATCH, DELETE | PATCH/DELETE: `config.manage` |
| `/api/config/periods`        | GET, POST          | POST: `config.manage`         |
| `/api/config/periods/[id]`   | PATCH, DELETE      | `config.manage`               |
| `/api/config/deadlines`      | GET, POST          | POST: `config.manage`         |
| `/api/config/deadlines/[id]` | PATCH, DELETE      | `config.manage`               |
| `/api/config/schema`         | GET, POST          | POST: `config.manage`         |

## Side Effects

- No domain events published.
- Audit events are created in the API route handlers (not in the service).
