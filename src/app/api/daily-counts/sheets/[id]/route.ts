import { NextRequest, NextResponse } from "next/server";
import { updateCountEntriesSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { getSheetById, updateEntries, computeSheetSummary } from "@/modules/daily-counts/service";
import type { EntryInput } from "@/modules/daily-counts/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const { id } = await params;
  const sheet = await getSheetById(id);
  if (!sheet) {
    return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  }

  if (
    !user.locationIds.includes(sheet.template.locationId) &&
    !hasPermission(user, "config.manage")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...sheet,
    summary: computeSheetSummary(sheet),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "counts.record")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sheet = await getSheetById(id);
  if (!sheet) {
    return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  }

  if (
    !user.locationIds.includes(sheet.template.locationId) &&
    !hasPermission(user, "config.manage")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateCountEntriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await updateEntries(id, parsed.data.entries as EntryInput[]);
    createAuditEvent({
      entityType: "DailyCountSheet",
      entityId: id,
      action: "entries_updated",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json({
      ...updated,
      summary: computeSheetSummary(updated),
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
