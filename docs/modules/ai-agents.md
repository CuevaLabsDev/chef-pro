# Module: ai-agents

**Path:** `src/modules/ai-agents/`
**Purpose:** Gemini-backed ChefPro assistant orchestration, chat sessions, saved insight reports, and scoped data tools.

## Files

| File              | Role                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| `client.ts`       | Gemini chat/text wrapper over `src/lib/gemini.ts`                          |
| `orchestrator.ts` | Intent routing, streaming, agent dispatch, tool-call loop                  |
| `tools.ts`        | Gemini function declarations and scoped Prisma-backed tool implementations |
| `prompts.ts`      | Shared system prompts and product scope boundaries                         |
| `service.ts`      | Chat session/message and insight report persistence                        |
| `types.ts`        | Agent, chat, report, and insight type signatures                           |
| `agents/*`        | Agent-specific non-streaming runner helpers                                |

## Dependencies

- `@/lib/gemini` for `@google/genai`, model selection, structured output helpers, and shared client creation.
- `@/lib/db` for chat sessions, messages, insight reports, and tool queries.
- `@/modules/identity-access/service` for permission-aware location scoping in tools.

## Gemini Runtime

| Concern                | Current behavior                                                |
| ---------------------- | --------------------------------------------------------------- |
| SDK                    | `@google/genai`                                                 |
| API key                | `GEMINI_API_KEY` preferred, `GOOGLE_AI_API_KEY` fallback        |
| Default model          | `gemini-3-flash-preview` via `GEMINI_MODEL` or default          |
| Structured output      | `responseMimeType: "application/json"` and `responseJsonSchema` |
| Validation             | First response is parsed and validated with Zod                 |
| Repair                 | One repair pass, temperature `0`, if Zod validation fails       |
| Extraction temperature | Defaults to `0.1` for structured-object generation              |

Do not document the default model as "latest"; it is only the configured default in code.

## Agents And Routing

| Agent                  | Used for                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `tasting-intelligence` | Tasting sessions, dish ratings, chef performance, rating trends, tasting temperature compliance |
| `menu-review`          | Menu signage packets, amendments, packet readiness, item completeness                           |
| `ops-assistant`        | General operations, closing verification, temperature logs, dashboard stats, operational risks  |

The router uses Gemini to classify the user message and falls back to `ops-assistant` on errors.

## Tool Scope

Every tool receives `ToolContext` with the authenticated `EffectiveUserContext`. Tool queries apply location filters from the user context. FTE users, users with `config.manage`, and users with `compliance.manage` can query broadly; other users are limited to assigned locations.

Operational-compliance tools:

| Tool                     | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `get_operational_audits` | Retrieve AI-assisted closing and temperature-log audits                   |
| `get_operational_risks`  | Summarize current tasting, closing, temperature-log, and open issue risks |

Both require `compliance.view` or `compliance.manage`; otherwise the tool returns an authorization error.

## API Routes

Exact route contracts are canonical in `docs/DATA-CONTRACTS.md`.

| Route                       | Behavior                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `POST /api/ai/chat`         | Streams assistant response and persists the user/model messages |
| `GET /api/ai/sessions`      | Lists the current user's sessions                               |
| `POST /api/ai/sessions`     | Creates an empty session                                        |
| `GET /api/ai/sessions/[id]` | Reads one current-user session                                  |
| `POST /api/ai/insights`     | Generates and saves an insight report                           |
| `GET /api/ai/insights`      | Lists current-user insight reports                              |

Current AI API routes are role-gated to `fte` and `ops`. The sidebar currently exposes `/ops/ai-assistant` by `reports.view`, so docs should call out that mismatch until the code is aligned.

## Streaming Events

`POST /api/ai/chat` emits server-sent events with these `type` values:

| Type         | Meaning                                |
| ------------ | -------------------------------------- |
| `session`    | Newly created or reused session id     |
| `agent`      | Agent chosen by the router             |
| `text`       | Assistant text chunk                   |
| `tool_calls` | Tool names currently being executed    |
| `done`       | Stream completed with final agent name |
| `error`      | Stream failed inside the generator     |

## Side Effects

- Creates `AiChatSession` and `AiChatMessage` records for chat.
- Creates `AiInsightReport` records for generated reports.
- Tool calls read scoped operational data; they should not mutate domain records.
