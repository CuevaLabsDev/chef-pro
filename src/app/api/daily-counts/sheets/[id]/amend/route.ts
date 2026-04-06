import { NextRequest, NextResponse } from "next/server";
import { amendCountSheetSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { getSheetById, amendSheet, computeSheetSummary } from "@/modules/daily-counts/service";
import type { EntryInput } from "@/modules/daily-counts/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = amendCountSheetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const amended = await amendSheet(
      id,
      user.id,
      parsed.data.reason,
      parsed.data.entries as EntryInput[]
    );
    createAuditEvent({
      entityType: "DailyCountSheet",
      entityId: id,
      action: "amended",
      actorId: user.id,
      actorName: user.name,
      metadata: { reason: parsed.data.reason },
    }).catch(() => {});
    return NextResponse.json({
      ...amended,
      summary: computeSheetSummary(amended),
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
