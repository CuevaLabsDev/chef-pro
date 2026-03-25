import { NextRequest, NextResponse } from "next/server";
import { createBuildingSchema } from "@/lib/validations";
import {
  createBuilding,
  getBuildings,
  findBuildingByCampusAndName,
  getCampusById,
} from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { conflictResponse, handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const buildings = await getBuildings();
  return NextResponse.json(buildings);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const campus = await getCampusById(parsed.data.campusId);
    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }
    if (!campus.isActive) {
      return conflictResponse(
        "Cannot create a building under an inactive campus. Reactivate the campus first.",
        "PARENT_CAMPUS_INACTIVE",
        { entityId: campus.id }
      );
    }

    const existing = await findBuildingByCampusAndName(parsed.data.campusId, parsed.data.name);
    if (existing) {
      if (existing.isActive) {
        return conflictResponse(
          "A building with this name already exists in the selected campus",
          "DUPLICATE_BUILDING",
          { entityId: existing.id }
        );
      }

      return conflictResponse(
        "A deactivated building with this name already exists in the selected campus. Reactivate it instead of creating a duplicate.",
        "INACTIVE_BUILDING_EXISTS",
        { entityId: existing.id }
      );
    }

    const building = await createBuilding(parsed.data);
    createAuditEvent({
      entityType: "Building",
      entityId: building.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(building, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
