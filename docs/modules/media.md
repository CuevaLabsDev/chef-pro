# Module: media

**Path:** `src/modules/media/`
**Purpose:** File uploads to Supabase Storage for tasting photos.

This module owns public tasting-photo uploads only. Operational audit evidence is stored separately by `src/modules/operational-compliance/` in the private `operational-audit-assets` bucket.

## Files

| File         | Role              |
| ------------ | ----------------- |
| `service.ts` | Upload logic      |
| `types.ts`   | UploadResult type |

## Dependencies

- `@/lib/supabase` (Supabase client + `STORAGE_BUCKET`)
- `uuid` (for generating storage keys)

Does **not** import Prisma directly. File metadata for tasting photos is returned from the Supabase Storage API. Operational audit assets store bucket/key metadata in Prisma through the operational-compliance module.

## Service Exports

| Function     | Signature                                                     |
| ------------ | ------------------------------------------------------------- |
| `uploadFile` | `(file: File, uploadedById: string) => Promise<UploadResult>` |

## UploadResult

```typescript
{
  storageKey: string; // UUID-based path in the bucket
  url: string; // Public URL
  fileName: string; // Original file name
  fileSize: number; // Bytes
  fileType: string; // MIME type
}
```

## Behavior Rules

1. **Storage bucket**: `tasting-photos` (defined in `lib/supabase.ts`).
2. **Key format**: UUID-based to avoid collisions.
3. **Supabase service role**: Uses the service role key (server-side only, full access).

## Related Storage

| Bucket                     | Owner                    | Privacy                               | Purpose                                                  |
| -------------------------- | ------------------------ | ------------------------------------- | -------------------------------------------------------- |
| `tasting-photos`           | `media`                  | Public URL returned by upload service | Tasting item photos                                      |
| `operational-audit-assets` | `operational-compliance` | Private, app-authorized signed URLs   | Closing photos, temperature logs, generated archive PDFs |

## API Route

| Route        | Methods | Permission    | Constraints           |
| ------------ | ------- | ------------- | --------------------- |
| `/api/media` | POST    | Authenticated | Max 10MB, images only |

The route receives a `FormData` with a `file` field, validates size and MIME type, then calls `uploadFile`.
