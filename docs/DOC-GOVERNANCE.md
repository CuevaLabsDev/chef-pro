# Documentation Governance

Rules for keeping the `docs/` folder accurate and useful. Every agent and human contributor must follow these.

## Document Inventory

| Document                 | Purpose                                        | Source Files It Mirrors                                                                               |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`   | System structure, module map, dependency rules | `src/modules/*/`, `src/app/`, `prisma/schema.prisma`                                                  |
| `docs/AGENT-WORKFLOW.md` | How agents should operate in this codebase     | `.cursor/rules/*.mdc`, `AGENTS.md`, all module patterns                                               |
| `docs/DATA-CONTRACTS.md` | All data shapes, validation, API contracts     | `prisma/schema.prisma`, `src/modules/*/types.ts`, `src/lib/validations.ts`, `src/app/api/**/route.ts` |
| `docs/DOC-GOVERNANCE.md` | This file — rules for doc maintenance          | (self-referencing)                                                                                    |
| `docs/UI-SYSTEM.md`      | Design tokens, components, layout patterns     | `src/components/ui/`, `src/app/globals.css`, portal layouts                                           |

## Update Triggers

When you change source code, check whether the corresponding doc needs updating:

| If You Changed...                                 | Update This Doc                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `prisma/schema.prisma` (new/changed model)        | `DATA-CONTRACTS.md` — Prisma Models section                                       |
| `src/modules/*/types.ts` (new/changed type)       | `DATA-CONTRACTS.md` — Module Type Signatures section                              |
| `src/lib/validations.ts` (new/changed Zod schema) | `DATA-CONTRACTS.md` — Zod Validation Schemas section                              |
| `src/app/api/**/route.ts` (new/changed route)     | `DATA-CONTRACTS.md` — API Route Reference section                                 |
| `src/modules/events/types.ts` (new event type)    | `DATA-CONTRACTS.md` — Domain Events section + `ARCHITECTURE.md` — Event Bus table |
| New module under `src/modules/`                   | `ARCHITECTURE.md` — Module Map table                                              |
| New portal or layout change                       | `ARCHITECTURE.md` — Three Portals section                                         |
| New UI component in `src/components/ui/`          | `UI-SYSTEM.md` — Component Catalog section                                        |
| `src/app/globals.css` token changes               | `UI-SYSTEM.md` — Design Tokens section                                            |
| New `.cursor/rules/*.mdc` file                    | `AGENT-WORKFLOW.md` — Before Coding section                                       |
| New npm script                                    | `AGENT-WORKFLOW.md` — Quick Commands table                                        |

## Staleness Checks

When working in a related area, agents should verify that doc claims match reality:

1. **Before starting work**: Skim the relevant doc section to build context.
2. **After completing work**: Re-read the same section. If your changes invalidated any claim, update the doc in the same commit.
3. **Spot-check heuristic**: If a doc mentions a count (e.g., "17 models", "14 permission keys"), verify the actual count still matches.

## Format Standards

- **Tables** for catalogs and references (models, routes, permissions, schemas).
- **Mermaid diagrams** for flows, dependency graphs, and state machines.
- **Code blocks** for type signatures (use `typescript` fence, keep signatures concise — field names and types, not full definitions).
- **Headings** match the sections listed in this governance table. Don't rename section headings without updating this file.
- **No duplication** across docs. Each fact has one canonical location. Cross-reference with markdown links (e.g., "See `docs/DATA-CONTRACTS.md`").

## Ownership

There is no single doc owner. The rule is: **if you change the source, you update the doc**. This applies equally to human developers and AI agents.

## When NOT to Update Docs

- Cosmetic code changes (rename a local variable, fix a typo) that don't alter the public interface.
- Adding tests that don't change behavior.
- Dependency version bumps that don't change APIs.
