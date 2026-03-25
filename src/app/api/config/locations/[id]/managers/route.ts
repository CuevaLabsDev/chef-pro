import { NextRequest, NextResponse } from "next/server";
import { assignManagerSchema } from "@/lib/validations";
import { getLocationById } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  assignUserToLocation,
  getAssignableUsers,
  getManagedKitchenAdminSummaries,
  getLocationManagers,
  isKitchenAdminManagedBy,
  hasPermission,
} from "@/modules/identity-access/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const canManageAllLocations = hasPermission(user, "config.manage");
  const canManageKitchenAdmins = hasPermission(user, "kitchen_admins.manage");
  if (!canManageAllLocations && !canManageKitchenAdmins) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const location = await getLocationById(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (!canManageAllLocations && !user.locationIds.includes(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (canManageAllLocations) {
    const [managers, assignable] = await Promise.all([
      getLocationManagers(id),
      getAssignableUsers(id),
    ]);
    return NextResponse.json({ managers, assignable });
  }

  const [assignedUsers, managedKitchenAdmins] = await Promise.all([
    getLocationManagers(id),
    getManagedKitchenAdminSummaries(user.id),
  ]);
  const managedKitchenAdminIds = new Set(managedKitchenAdmins.map((entry) => entry.id));

  const managers = assignedUsers.filter((entry) => managedKitchenAdminIds.has(entry.id));
  const assignedManagedIds = new Set(managers.map((entry) => entry.id));
  const assignable = managedKitchenAdmins
    .filter((entry) => !assignedManagedIds.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: "kitchen_admin",
      roleSubtype: null,
    }));

  return NextResponse.json({ managers, assignable });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  const canManageAllLocations = hasPermission(user, "config.manage");
  const canManageKitchenAdmins = hasPermission(user, "kitchen_admins.manage");
  if (!canManageAllLocations && !canManageKitchenAdmins) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const location = await getLocationById(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (!canManageAllLocations && !user.locationIds.includes(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = assignManagerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (canManageKitchenAdmins && !canManageAllLocations) {
    const isManaged = await isKitchenAdminManagedBy(user.id, parsed.data.userId);
    if (!isManaged) {
      return NextResponse.json(
        { error: "You can only assign kitchen admins you manage." },
        { status: 403 }
      );
    }
  }

  try {
    await assignUserToLocation(parsed.data.userId, id);
  } catch {
    return NextResponse.json(
      { error: "User is already assigned to this location" },
      { status: 409 }
    );
  }

  const managers = await getLocationManagers(id);
  return NextResponse.json({ managers }, { status: 201 });
}
