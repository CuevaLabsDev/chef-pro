# Pattern: Testing

Tests use Vitest with mock-based unit testing. Each service module can be tested without a database connection.

## Configuration

- **Framework:** Vitest
- **Environment:** `node`
- **Pattern:** `src/**/*.test.ts`
- **Path alias:** `@` maps to `src/`
- **Config:** `vitest.config.ts`

## Test File Placement

Place test files next to the file they test:

```
src/modules/configuration/
  service.ts
  service.test.ts      <-- tests for service.ts
  types.ts
```

## Canonical Mock Pattern

The core technique: mock `@/lib/db` before importing the service under test. Vitest hoists `vi.mock()` calls automatically.

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Prisma -- hoisted before all imports
vi.mock("@/lib/db", () => ({
  prisma: {
    widget: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // Add other models this service uses
  },
}));

// Import after mock declaration
import { prisma } from "@/lib/db";
import { getWidgets, createWidget } from "./service";

// Cast for type-safe mock assertions
const mockWidgetFindMany = prisma.widget.findMany as ReturnType<typeof vi.fn>;
const mockWidgetCreate = prisma.widget.create as ReturnType<typeof vi.fn>;

describe("widget service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all active widgets", async () => {
    const fakeWidgets = [{ id: "1", name: "Test", isActive: true }];
    mockWidgetFindMany.mockResolvedValue(fakeWidgets);

    const result = await getWidgets();

    expect(result).toEqual(fakeWidgets);
    expect(mockWidgetFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates a widget", async () => {
    const input = { name: "New Widget" };
    const created = { id: "2", ...input };
    mockWidgetCreate.mockResolvedValue(created);

    const result = await createWidget(input);

    expect(result).toEqual(created);
    expect(mockWidgetCreate).toHaveBeenCalledWith({
      data: { name: "New Widget" },
    });
  });
});
```

## Mocking Additional Modules

If the service under test imports from other modules (audit, events, notifications), mock those too:

```typescript
vi.mock("@/modules/audit/service", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/modules/events/bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/modules/events/subscriptions", () => ({
  ensureSubscriptions: vi.fn(),
}));
```

## Mocking Transactions

For services that use `prisma.$transaction`, mock it to execute the callback immediately:

```typescript
vi.mock("@/lib/db", () => {
  const mockTx = {
    tastingSession: { update: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  return {
    prisma: {
      $transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
      tastingSession: mockTx.tastingSession,
      auditEvent: mockTx.auditEvent,
    },
  };
});
```

## What to Test

| Test category     | What to assert                                          |
| ----------------- | ------------------------------------------------------- |
| Read operations   | Correct Prisma method called with expected filters      |
| Create operations | Correct data shape passed to `create`                   |
| Update operations | Correct `where` + `data` passed to `update`             |
| Transactions      | All writes within transaction called in order           |
| Permission guards | Service rejects unauthorized operations (if applicable) |
| Edge cases        | Null returns, empty arrays, duplicate handling          |
| Event publishing  | `eventBus.publish` called with correct event type       |

## Running Tests

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:ci       # verbose output
```

## Rules

1. **Mock at the module boundary.** Mock `@/lib/db`, not individual Prisma internals.
2. **Clear mocks in beforeEach.** Always call `vi.clearAllMocks()` to prevent test pollution.
3. **Test behavior, not implementation.** Assert what the service does (calls, returns), not how Prisma works internally.
4. **One test file per service.** Keep test files co-located with the service they test.
5. **No real database.** Tests must run with zero network/DB dependency.
