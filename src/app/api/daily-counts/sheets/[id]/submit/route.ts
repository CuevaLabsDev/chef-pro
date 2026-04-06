import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { getSheetById, submitSheet } from "@/modules/daily-counts/service";

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

  try {
    const submitted = await submitSheet(id, user.id);
    createAuditEvent({
      entityType: "DailyCountSheet",
      entityId: id,
      action: "submitted",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(submitted);
  } catch (err) {
    return handleServiceError(err);
  }
}
