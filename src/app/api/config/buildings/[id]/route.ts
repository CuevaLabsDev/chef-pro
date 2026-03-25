import { NextRequest, NextResponse } from "next/server";
import { updateBuildingSchema } from "@/lib/validations";
import {
  getBuildingById,
  updateBuilding,
  deactivateBuildingCascade,
  reactivateBuilding,
  findBuildingByCampusAndName,
  permanentlyDeleteBuilding,
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
  const building = await getBuildingById(id);
  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  return NextResponse.json(building);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getBuildingById(id);
  if (!existing) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { name, isActive } = parsed.data;

    if (name !== undefined) {
      const byName = await findBuildingByCampusAndName(existing.campusId, name);
      if (byName && byName.id !== id) {
        if (byName.isActive) {
          return conflictResponse(
            "A building with this name already exists in the selected campus",
            "DUPLICATE_BUILDING",
            { entityId: byName.id }
          );
        }

        return conflictResponse(
          "A deactivated building with this name already exists in the selected campus. Reactivate it instead of creating a duplicate.",
          "INACTIVE_BUILDING_EXISTS",
          { entityId: byName.id }
        );
      }
    }

    let updated = existing;

    if (isActive === false) {
      updated = await deactivateBuildingCascade(id);
      createAuditEvent({
        entityType: "Building",
        entityId: id,
        action: "deactivated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    if (isActive === true) {
      const reactivated = await reactivateBuilding(id);
      if (reactivated.status === "not_found") {
        return NextResponse.json({ error: "Building not found" }, { status: 404 });
      }
      if (reactivated.status === "parent_inactive") {
        return conflictResponse(
          "Cannot reactivate this building because its campus is inactive. Reactivate the campus first.",
          "PARENT_INACTIVE",
          { parentType: reactivated.parentType, parentId: reactivated.parentId }
        );
      }
      updated = reactivated.record;
      createAuditEvent({
        entityType: "Building",
        entityId: id,
        action: "reactivated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    if (name !== undefined) {
      updated = await updateBuilding(id, { name });
      createAuditEvent({
        entityType: "Building",
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
      const deleted = await permanentlyDeleteBuilding(id);
      if (deleted.status === "not_found") {
        return NextResponse.json({ error: "Building not found" }, { status: 404 });
      }
      if (deleted.status === "blocked") {
        return conflictResponse(deleted.message, deleted.code, deleted.details);
      }

      createAuditEvent({
        entityType: "Building",
        entityId: id,
        action: "deleted_permanently",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
      return NextResponse.json(deleted.record);
    }

    const updated = await deactivateBuildingCascade(id);
    createAuditEvent({
      entityType: "Building",
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
