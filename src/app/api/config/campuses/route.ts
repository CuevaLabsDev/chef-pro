import { NextRequest, NextResponse } from "next/server";
import { createCampusSchema } from "@/lib/validations";
import { getCampuses, createCampus, findCampusByName } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { conflictResponse, handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
  const campuses = await getCampuses({ includeInactive });
  return NextResponse.json(campuses);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createCampusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await findCampusByName(parsed.data.name);
    if (existing) {
      if (existing.isActive) {
        return conflictResponse("A campus with this name already exists", "DUPLICATE_CAMPUS", {
          entityId: existing.id,
        });
      }

      return conflictResponse(
        "A deactivated campus with this name already exists. Reactivate it instead of creating a duplicate.",
        "INACTIVE_CAMPUS_EXISTS",
        { entityId: existing.id }
      );
    }

    const campus = await createCampus(parsed.data.name);
    createAuditEvent({
      entityType: "Campus",
      entityId: campus.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(campus, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
