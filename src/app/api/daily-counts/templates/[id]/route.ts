import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { getTemplateById, deleteTemplate } from "@/modules/daily-counts/service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasAnyPermission(user, ["counts.record", "counts.configure", "counts.view"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (!user.locationIds.includes(template.locationId) && !hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "counts.configure")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (!user.locationIds.includes(template.locationId) && !hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteTemplate(id);
    createAuditEvent({
      entityType: "CountSheetTemplate",
      entityId: id,
      action: "deactivated",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
