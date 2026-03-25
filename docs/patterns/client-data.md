# Pattern: Client-Side Data Fetching

Client components use SWR for reads and a custom `useMutation` hook for writes.

## Reading Data: `useApi`

`src/lib/hooks/use-fetch.ts` exports:

- `fetcher(url: string)` -- Fetch wrapper that throws on non-OK responses
- `useApi<T>(url: string | null, config?)` -- SWR hook wrapping `fetcher`

### Usage

```typescript
"use client";
import { useApi } from "@/lib/hooks/use-fetch";

interface Campus {
  id: string;
  name: string;
}

export default function CampusList() {
  const { data, error, isLoading } = useApi<Campus[]>("/api/config/campuses");

  if (isLoading) return <Skeleton />;
  if (error) return <div>Failed to load</div>;

  return (
    <ul>
      {data?.map((c) => <li key={c.id}>{c.name}</li>)}
    </ul>
  );
}
```

### Conditional Fetching

Pass `null` to skip the request (SWR convention):

```typescript
const { data } = useApi<Location>(selectedId ? `/api/config/locations/${selectedId}` : null);
```

## Writing Data: `useMutation`

`src/lib/hooks/use-mutation.ts` exports `useMutation(options?)` which returns `{ trigger, loading }`.

### Usage

```typescript
"use client";
import { useMutation } from "@/lib/hooks/use-mutation";

export default function CreateCampusForm() {
  const { trigger, loading } = useMutation({
    successMessage: "Campus created",
    invalidateKeys: ["/api/config/campuses"],
  });

  async function onSubmit(data: { name: string }) {
    await trigger("/api/config/campuses", "POST", data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
      <button disabled={loading}>Create</button>
    </form>
  );
}
```

### Options

| Option           | Type         | Description                                 |
| ---------------- | ------------ | ------------------------------------------- |
| `successMessage` | `string`     | Toast message shown on success              |
| `invalidateKeys` | `string[]`   | SWR cache keys to revalidate after mutation |
| `onSuccess`      | `() => void` | Callback after successful mutation          |

### How it works

1. `trigger(url, method, body?)` calls `fetch` with JSON body
2. On success: shows toast, invalidates specified SWR keys, calls `onSuccess`
3. On failure: shows error toast with the server's error message
4. `loading` is `true` while the request is in flight

## SWR Key Conventions

SWR keys are the URL strings passed to `useApi`. When invalidating after a mutation, match the exact URL:

| Data            | SWR Key                         |
| --------------- | ------------------------------- |
| Campus list     | `/api/config/campuses`          |
| Single campus   | `/api/config/campuses/${id}`    |
| Tasting list    | `/api/tastings?chefId=${id}`    |
| Packet list     | `/api/packets?locationId=${id}` |
| Dashboard stats | `/api/dashboard/stats`          |

To invalidate a list after creating an item, include the list URL in `invalidateKeys`.

## Rules

1. **useApi for all reads.** Don't call `fetch` directly in components.
2. **useMutation for all writes.** It handles toasts, cache invalidation, and loading state.
3. **Invalidate related keys.** After creating a campus, invalidate `/api/config/campuses` so the list refreshes.
4. **Conditional fetch with null.** Don't fetch until you have required parameters.
5. **No server imports.** Client components must never import from `@/lib/db`, `@/modules/*/service`, or server-only code.
