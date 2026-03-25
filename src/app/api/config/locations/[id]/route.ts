import { NextRequest, NextResponse } from "next/server";
import { updateLocationSchema } from "@/lib/validations";
import {
  getLocationDetail,
  updateLocation,
  reactivateLocation,
  findLocationByName,
  getBuildingWithCampusById,
  permanentlyDeleteLocation,
} from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { conflictResponse, handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const location = await getLocationDetail(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(location);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getLocationDetail(id);
  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { name, description, buildingId, isActive } = parsed.data;

    if (name !== undefined) {
      const byName = await findLocationByName(name);
      if (byName && byName.id !== id) {
        if (byName.isActive) {
          return conflictResponse(
            "A cafe/concept with this name already exists",
            "DUPLICATE_LOCATION",
            {
              entityId: byName.id,
            }
          );
        }

        return conflictResponse(
          "A deactivated cafe/concept with this name already exists. Reactivate it instead of creating a duplicate.",
          "INACTIVE_LOCATION_EXISTS",
          { entityId: byName.id }
        );
      }
    }

    if (buildingId !== undefined && buildingId !== null) {
      const building = await getBuildingWithCampusById(buildingId);
      if (!building) {
        return NextResponse.json({ error: "Building not found" }, { status: 404 });
      }
      if (!building.isActive) {
        return conflictResponse(
          "Cannot assign this cafe/concept to an inactive building. Reactivate the building first.",
          "PARENT_BUILDING_INACTIVE",
          { entityId: building.id }
        );
      }
      if (!building.campus.isActive) {
        return conflictResponse(
          "Cannot assign this cafe/concept to an inactive campus. Reactivate the campus first.",
          "PARENT_CAMPUS_INACTIVE",
          { entityId: building.campusId }
        );
      }
    }

    let updated: unknown = existing;

    if (isActive === false) {
      updated = await updateLocation(id, { isActive: false });
      createAuditEvent({
        entityType: "Location",
        entityId: id,
        action: "deactivated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    if (isActive === true) {
      const reactivated = await reactivateLocation(id);
      if (reactivated.status === "not_found") {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
      if (reactivated.status === "parent_inactive") {
        const entity = reactivated.parentType === "Building" ? "building" : "campus";
        return conflictResponse(
          `Cannot reactivate this cafe/concept because its ${entity} is inactive. Reactivate the ${entity} first.`,
          "PARENT_INACTIVE",
          { parentType: reactivated.parentType, parentId: reactivated.parentId }
        );
      }
      updated = reactivated.record;
      createAuditEvent({
        entityType: "Location",
        entityId: id,
        action: "reactivated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    if (name !== undefined || description !== undefined || buildingId !== undefined) {
      updated = await updateLocation(id, {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description ?? undefined } : {}),
        ...(buildingId !== undefined ? { buildingId: buildingId ?? undefined } : {}),
      });
      createAuditEvent({
        entityType: "Location",
        entityId: id,
        action: "updated",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const isPermanentDelete = req.nextUrl.searchParams.get("permanent") === "true";

  try {
    if (isPermanentDelete) {
      const deleted = await permanentlyDeleteLocation(id);
      if (deleted.status === "not_found") {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
      if (deleted.status === "blocked") {
        return conflictResponse(deleted.message, deleted.code, deleted.details);
      }

      createAuditEvent({
        entityType: "Location",
        entityId: id,
        action: "deleted_permanently",
        actorId: user.id,
        actorName: user.name,
      }).catch(() => {});
      return NextResponse.json(deleted.record);
    }

    const updated = await updateLocation(id, { isActive: false });
    createAuditEvent({
      entityType: "Location",
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
