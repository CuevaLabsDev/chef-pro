# Module: daily-counts

**Path:** `src/modules/daily-counts/`
**Purpose:** Configurable daily count sheets for locations and tasting periods.

## Files

| File              | Role                                                       |
| ----------------- | ---------------------------------------------------------- |
| `service.ts`      | Template CRUD, sheet lifecycle, amendments, summary totals |
| `types.ts`        | Template, section, entry, and summary type contracts       |
| `service.test.ts` | Unit coverage for count summary calculations               |

## Dependencies

- `@/lib/db` for Prisma reads and writes.
- `@/lib/validations` for shared API schemas.
- `@/modules/audit/service` from API routes for generic `AuditEvent` records.

## Concepts

| Concept              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `CountSheetTemplate` | One active template per location and tasting period |
| `CountSheetSection`  | A configured section with fields and display order  |
| `DailyCountSheet`    | One dated sheet for a template                      |
| `DailyCountEntry`    | Values for one sheet section                        |

Field definitions support `number`, `text`, and `time` fields. Numeric fields can use roles `initial`, `addition`, `remainder`, or `label`; totals use `initial + addition - remainder`.

## Workflows

| Workflow           | Behavior                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Configure template | `counts.configure` users upsert sections/fields for assigned locations; `config.manage` can act broadly.  |
| Create sheet       | `counts.record` users create or retrieve a dated sheet from a template.                                   |
| Update entries     | Draft sheets can be updated with section values. Submitted sheets reject normal updates.                  |
| Submit sheet       | Marks the sheet `submitted` and records submitter/time.                                                   |
| Amend sheet        | Submitted sheets can be amended with a reason and replacement entry values.                               |
| List/read sheets   | `counts.view` or `counts.record` users can list/read scoped sheets; responses include computed summaries. |

## Permissions

| Permission         | Behavior                               |
| ------------------ | -------------------------------------- |
| `counts.configure` | Manage count sheet templates           |
| `counts.record`    | Create, edit, submit, and amend sheets |
| `counts.view`      | View count sheet history and summaries |

Location access is enforced in route handlers. `config.manage` acts as broad location access.

## API Routes

Exact request and response contracts are canonical in `docs/DATA-CONTRACTS.md`.

| Route                                       | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `GET /api/daily-counts/templates`           | Read a template by `locationId` and `periodId` query params |
| `POST /api/daily-counts/templates`          | Upsert template sections                                    |
| `GET /api/daily-counts/templates/[id]`      | Read one template                                           |
| `DELETE /api/daily-counts/templates/[id]`   | Soft-deactivate a template                                  |
| `GET /api/daily-counts/sheets`              | List scoped sheets with summaries                           |
| `POST /api/daily-counts/sheets`             | Create or retrieve a sheet for `templateId` and `date`      |
| `GET /api/daily-counts/sheets/[id]`         | Read one sheet with summary                                 |
| `PATCH /api/daily-counts/sheets/[id]`       | Update draft entries                                        |
| `POST /api/daily-counts/sheets/[id]/submit` | Submit a sheet                                              |
| `POST /api/daily-counts/sheets/[id]/amend`  | Amend a submitted sheet                                     |

## Side Effects

Daily count API routes create generic `AuditEvent` rows for template upsert/deactivation and sheet create/update/submit/amend actions.
