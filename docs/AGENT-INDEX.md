# ChefPro Agent Index

Read this file first before making any changes to the codebase.
It maps common tasks to the docs you must read before writing code.

## Task Routing

| When the task involves...            | Read these docs (in order)                                           |
| ------------------------------------ | -------------------------------------------------------------------- |
| Adding a new feature end-to-end      | `workflows/add-feature.md` then the relevant `modules/<name>.md`     |
| Adding or modifying an API route     | `patterns/api-route.md` then `workflows/add-api-route.md`            |
| Adding a service function            | `patterns/service-function.md` then the relevant `modules/<name>.md` |
| Adding or changing a Zod schema      | `patterns/validation.md`                                             |
| Writing or updating tests            | `patterns/testing.md`                                                |
| Client-side data fetching / mutation | `patterns/client-data.md`                                            |
| Changing the Prisma schema           | `workflows/modify-schema.md` then `domain-model.md`                  |
| Adding a new RBAC permission         | `workflows/add-permission.md` then `modules/identity-access.md`      |
| Adding a new domain event            | `workflows/add-domain-event.md` then `modules/events.md`             |
| Understanding the architecture       | `architecture.md`                                                    |
| Understanding domain rules           | `domain-model.md`                                                    |

## Doc Map

```
docs/
  AGENT-INDEX.md              <-- you are here
  architecture.md             -- module map, layering, data flow
  domain-model.md             -- entities, state machines, RBAC

  patterns/
    api-route.md              -- route handler template
    service-function.md       -- service layer patterns
    validation.md             -- Zod schema conventions
    testing.md                -- mock patterns, test structure
    client-data.md            -- SWR hooks, mutations

  modules/
    identity-access.md        -- auth, RBAC, middleware
    tasting-capture.md        -- session CRUD, submit flow
    review-compliance.md      -- status transitions
    configuration.md          -- campuses, locations, periods, deadlines, schemas
    menu-signage.md           -- packet structure vs execution
    notifications.md          -- channels, send patterns
    audit.md                  -- audit event contract
    media.md                  -- Supabase storage
    events.md                 -- domain event bus

  workflows/
    add-feature.md            -- end-to-end feature checklist
    add-api-route.md          -- new endpoint checklist
    add-permission.md         -- RBAC addition flow
    modify-schema.md          -- schema change process
    add-domain-event.md       -- new event type + subscribers
```

## Rules

- Always read the relevant docs before generating code.
- Never skip steps in a workflow checklist.
- If a pattern doc shows a template, follow that template exactly.
- If a module doc lists side effects (events, audit), include them.
- After making changes, run `npm run lint`, `npm run typecheck`, and `npm test`.
