import { NextRequest, NextResponse } from "next/server";
import { upsertCountSheetTemplateSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { getTemplate, upsertTemplate } from "@/modules/daily-counts/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasAnyPermission(user, ["counts.record", "counts.configure", "counts.view"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const locationId = req.nextUrl.searchParams.get("locationId");
  const periodId = req.nextUrl.searchParams.get("periodId");
  if (!locationId || !periodId) {
    return NextResponse.json({ error: "locationId and periodId are required" }, { status: 400 });
  }

  if (!user.locationIds.includes(locationId) && !hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await getTemplate(locationId, periodId);
  if (!template) {
    return NextResponse.json(null);
  }
  return NextResponse.json(template);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "counts.configure")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = upsertCountSheetTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!user.locationIds.includes(parsed.data.locationId) && !hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const template = await upsertTemplate(parsed.data);
    createAuditEvent({
      entityType: "CountSheetTemplate",
      entityId: template.id,
      action: "upserted",
      actorId: user.id,
      actorName: user.name,
      metadata: {
        locationId: parsed.data.locationId,
        periodId: parsed.data.tastingPeriodId,
        sectionCount: parsed.data.sections.length,
      },
    }).catch(() => {});
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
