# Module: operational-compliance

**Path:** `src/modules/operational-compliance/`
**Purpose:** AI-assisted closing verification and temperature-log intelligence for operational audit records.

This module stores operational evidence and AI-assisted findings. It does not make regulatory determinations. UI and reports must describe findings as **AI-assisted potential issues** that **need manager review**.

## Files

| File            | Role                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `service.ts`    | Upload flow, Gemini analysis, storage, PDF archive, reads, reanalysis |
| `rules.ts`      | Default temperature rule evaluation                                   |
| `types.ts`      | Audit/file/status/type contracts                                      |
| `rules.test.ts` | Unit coverage for threshold and review-status behavior                |

## Dependencies

- `@/lib/db` for Prisma records.
- `@/lib/supabase` for server-side service-role access to private audit assets.
- `@/lib/gemini` for structured Gemini analysis.
- `@/modules/identity-access/service` for permission checks.
- `pdf-lib` for generated temperature-log archive PDFs.

## Core Workflows

| Workflow               | Behavior                                                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Closing upload         | Creates an `OperationalAudit`, stores source assets, asks Gemini to assess uploaded closing photos, stores `ClosingPhoto` rows, and creates `ComplianceIssue` rows for AI-assisted potential issues or missing categories.                                  |
| Temperature-log upload | Creates an `OperationalAudit`, stores the source image/PDF, asks Gemini to extract entries, evaluates default hot/cold rules, creates `TemperatureLog` and `TemperatureEntry` rows, stores issues, and uploads a generated PDF archive.                     |
| Manager review         | Managers can read scoped audits and, through the API, update issue status to `open`, `acknowledged`, `resolved`, or `dismissed`. Current `/ops/compliance` UI displays issues and supports reanalysis/assets; it does not expose issue-status controls yet. |
| Reanalysis             | Requires `compliance.manage`. Source assets are retained. Derived photo/log/entry/issue rows are deleted and regenerated. Temperature-log reanalysis creates a new generated PDF asset.                                                                     |
| Signed asset URL       | Returns a short-lived signed URL after auth, permission, and location checks.                                                                                                                                                                               |

## Access Rules

| Permission          | Current behavior                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `compliance.record` | Upload evidence for assigned locations. Record-only users can read detail for audits they submitted when still location-scoped. |
| `compliance.view`   | List and view scoped audits.                                                                                                    |
| `compliance.manage` | Reanalyze audits and update issue status. Also counts as broad audit view access.                                               |

Location scoping is enforced in the service layer. FTE users, users with `config.manage`, and users with `compliance.manage` can view across locations; other users are limited to their assigned `locationIds`.

## Data And Statuses

Exact Prisma fields, indexes, and route response shapes are canonical in `docs/DATA-CONTRACTS.md`.

| Concept                   | Values                                               |
| ------------------------- | ---------------------------------------------------- |
| Audit types               | `closing`, `temperature_log`                         |
| Audit statuses            | `processing`, `completed`, `needs_review`, `failed`  |
| Closing categories        | `station`, `line`, `walk_in`, `dish_area`, `storage` |
| Holding types             | `hot`, `cold`, `unknown`                             |
| Entry compliance statuses | `compliant`, `potential_issue`, `needs_review`       |
| Issue severities          | `low`, `medium`, `high`                              |
| Issue statuses            | `open`, `acknowledged`, `resolved`, `dismissed`      |

## Rule Defaults

| Rule                   | Default                                   |
| ---------------------- | ----------------------------------------- |
| Cold holding           | Compliant at `<= 41F`                     |
| Hot holding            | Compliant at `>= 135F`                    |
| Low confidence         | Confidence `< 0.7` creates manager review |
| Ambiguous holding type | `needs_review`, not a violation           |

Defaults are model-code defaults; local rule configuration is not implemented yet.

## File Handling

| Item                 | Behavior                                                                           |
| -------------------- | ---------------------------------------------------------------------------------- |
| Durable storage      | Private Supabase bucket `operational-audit-assets`                                 |
| Bucket access        | Server-side service role key only; docs must not claim Supabase RLS enforcement    |
| Stored metadata      | Database stores bucket/key/file metadata; assets are retrieved through signed URLs |
| Signed URL lifetime  | `{ url, expiresIn: 300 }`                                                          |
| Max file size        | 20 MB                                                                              |
| Supported MIME types | `image/jpeg`, `image/png`, `image/webp`, `application/pdf`                         |
| Gemini analysis      | PDFs and files over 7 MB use Gemini Files API; small images use inline base64      |
| Gemini cleanup       | No Gemini Files API cleanup/delete path is implemented                             |

Closing UI currently selects image files, but backend validation also allows PDFs.

## API Routes

Exact request and response contracts live in `docs/DATA-CONTRACTS.md`.

| Route                                                     | Purpose                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/operational-audits`                             | List scoped audits; requires `compliance.view` or `compliance.manage` |
| `POST /api/operational-audits/closing`                    | Upload closing evidence                                               |
| `POST /api/operational-audits/temperature-logs`           | Upload a temperature log image/PDF                                    |
| `GET /api/operational-audits/[id]`                        | Read scoped audit detail                                              |
| `POST /api/operational-audits/[id]/reanalyze`             | Re-run AI analysis in place                                           |
| `GET /api/operational-audits/assets/[assetId]/signed-url` | Create short-lived asset URL                                          |
| `PATCH /api/operational-audits/issues/[issueId]`          | Update issue status                                                   |

## Side Effects

- Creates operational audit/evidence/issue records as the compliance audit trail.
- Does not currently emit domain events.
- Does not currently create generic `AuditEvent` rows.
