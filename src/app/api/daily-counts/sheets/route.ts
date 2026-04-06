import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { getOrCreateSheet, listSheets, computeSheetSummary } from "@/modules/daily-counts/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasAnyPermission(user, ["counts.view", "counts.record"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");

  const hasGlobalAccess = hasPermission(user, "config.manage");
  const locationIds = hasGlobalAccess ? undefined : user.locationIds;

  const sheets = await listSheets({
    locationIds,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  });

  const result = sheets.map((sheet) => ({
    ...sheet,
    summary: computeSheetSummary(sheet as never),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "counts.record")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { templateId, date } = body;

  if (!templateId || !date) {
    return NextResponse.json({ error: "templateId and date are required" }, { status: 400 });
  }

  try {
    const sheet = await getOrCreateSheet(templateId, new Date(date));

    if (
      !user.locationIds.includes(sheet.template.locationId) &&
      !hasPermission(user, "config.manage")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    createAuditEvent({
      entityType: "DailyCountSheet",
      entityId: sheet.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
      metadata: {
        templateId,
        date,
        locationId: sheet.template.locationId,
      },
    }).catch(() => {});

    return NextResponse.json(sheet, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
