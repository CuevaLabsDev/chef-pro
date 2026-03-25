import { NextRequest, NextResponse } from "next/server";
import { createLocationSchema } from "@/lib/validations";
import {
  getLocations,
  getLocationsByIds,
  createLocation,
  findLocationByName,
  getBuildingWithCampusById,
} from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  getManagedKitchenAdminContextForManager,
  hasAnyPermission,
  hasPermission,
} from "@/modules/identity-access/service";
import { conflictResponse, handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const viewAsKitchenAdminId = req.nextUrl.searchParams.get("viewAsKitchenAdminId");

  let scopedLocationIds = user.locationIds;
  if (viewAsKitchenAdminId) {
    if (!hasPermission(user, "kitchen_admins.view_as")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const managedKitchenAdmin = await getManagedKitchenAdminContextForManager(
      user.id,
      viewAsKitchenAdminId
    );
    if (!managedKitchenAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    scopedLocationIds = managedKitchenAdmin.locationIds;
  }

  const hasGlobalLocationAccess = hasAnyPermission(user, [
    "config.manage",
    "packets.override",
    "reviews.manage",
  ]);
  const locations =
    hasGlobalLocationAccess && !viewAsKitchenAdminId
      ? await getLocations()
      : await getLocationsByIds(scopedLocationIds);
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await findLocationByName(parsed.data.name);
    if (existing) {
      if (existing.isActive) {
        return conflictResponse(
          "A cafe/concept with this name already exists",
          "DUPLICATE_LOCATION",
          {
            entityId: existing.id,
          }
        );
      }

      return conflictResponse(
        "A deactivated cafe/concept with this name already exists. Reactivate it instead of creating a duplicate.",
        "INACTIVE_LOCATION_EXISTS",
        { entityId: existing.id }
      );
    }

    if (parsed.data.buildingId) {
      const building = await getBuildingWithCampusById(parsed.data.buildingId);
      if (!building) {
        return NextResponse.json({ error: "Building not found" }, { status: 404 });
      }
      if (!building.isActive) {
        return conflictResponse(
          "Cannot create a cafe/concept under an inactive building. Reactivate the building first.",
          "PARENT_BUILDING_INACTIVE",
          { entityId: building.id }
        );
      }
      if (!building.campus.isActive) {
        return conflictResponse(
          "Cannot create a cafe/concept under an inactive campus. Reactivate the campus first.",
          "PARENT_CAMPUS_INACTIVE",
          { entityId: building.campusId }
        );
      }
    }

    const location = await createLocation(parsed.data);
    createAuditEvent({
      entityType: "Location",
      entityId: location.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(location, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
