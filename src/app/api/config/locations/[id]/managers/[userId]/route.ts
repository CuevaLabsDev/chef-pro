import { NextRequest, NextResponse } from "next/server";
import { updateManagerRoleSchema } from "@/lib/validations";
import { getLocationById } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  getLocationManagers,
  hasPermission,
  isKitchenAdminManagedBy,
  removeUserFromLocation,
  updateUserRoleProfile,
} from "@/modules/identity-access/service";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "permissions.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, userId } = await params;
  const location = await getLocationById(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateManagerRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await updateUserRoleProfile(userId, parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const managers = await getLocationManagers(id);
  return NextResponse.json({ managers });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  const canManageAllLocations = hasPermission(user, "config.manage");
  const canManageKitchenAdmins = hasPermission(user, "kitchen_admins.manage");
  if (!canManageAllLocations && !canManageKitchenAdmins) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, userId } = await params;
  const location = await getLocationById(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (!canManageAllLocations) {
    if (!user.locationIds.includes(id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const isManaged = await isKitchenAdminManagedBy(user.id, userId);
    if (!isManaged) {
      return NextResponse.json(
        { error: "You can only remove kitchen admins you manage." },
        { status: 403 }
      );
    }
  }

  try {
    await removeUserFromLocation(userId, id);
  } catch {
    return NextResponse.json({ error: "User is not assigned to this location" }, { status: 404 });
  }

  const managers = await getLocationManagers(id);
  return NextResponse.json({ managers });
}
