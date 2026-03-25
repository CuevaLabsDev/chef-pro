import { NextRequest, NextResponse } from "next/server";
import { updateCampusSchema } from "@/lib/validations";
import {
  getCampusById,
  updateCampus,
  deactivateCampusCascade,
  reactivateCampus,
  findCampusByName,
  permanentlyDeleteCampus,
} from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { conflictResponse, handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const campus = await getCampusById(id);
  if (!campus) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  return NextResponse.json(campus);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getCampusById(id);
  if (!existing) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateCampusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { name, isActive } = parsed.data;

    if (name !== undefined) {
      const byName = await findCampusByName(name);
      if (byName && byName.id !== id) {
        if (byName.isActive) {
          return conflictResponse("A campus with this name already exists", "DUPLICATE_CAMPUS", {
            entityId: byName.id,
          });
        }

        return conflictResponse(
          "A deactivated campus with this name already exists. Reactivate it instead of creating a duplicate.",
          "INACTIVE_CAMPUS_EXISTS",
          { entityId: byName.id }
        );
      }
    }

    let updated: unknown = existing;

    if (isActive === false) {
      updated = await deactivateCampusCascade(id);
      createAuditEvent({
        entityType: "Campus",
        entityId: id,
        action: "deactivated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    if (isActive === true) {
      updated = await reactivateCampus(id);
      createAuditEvent({
        entityType: "Campus",
        entityId: id,
        action: "reactivated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    if (name !== undefined) {
      updated = await updateCampus(id, { name });
      createAuditEvent({
        entityType: "Campus",
        entityId: id,
        action: "updated",
        actorId: user.id,
        actorName: user.name,
        fieldName: "name",
        newValue: name,
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const isPermanentDelete = req.nextUrl.searchParams.get("permanent") === "true";

  try {
    if (isPermanentDelete) {
      const deleted = await permanentlyDeleteCampus(id);
      if (deleted.status === "not_found") {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 });
      }
      if (deleted.status === "blocked") {
        return conflictResponse(deleted.message, deleted.code, deleted.details);
      }

      createAuditEvent({
        entityType: "Campus",
        entityId: id,
        action: "deleted_permanently",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
      return NextResponse.json(deleted.record);
    }

    const updated = await deactivateCampusCascade(id);
    createAuditEvent({
      entityType: "Campus",
      entityId: id,
      action: "deactivated",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(updated);
  } catch (err) {
    return handleServiceError(err);
  }
}
