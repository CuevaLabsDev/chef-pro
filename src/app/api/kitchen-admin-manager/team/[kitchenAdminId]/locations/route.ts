import { NextRequest, NextResponse } from "next/server";
import { replaceLocationAccessSchema } from "@/lib/validations";
import { getLocationsByIds } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  getManagedKitchenAdminContextForManager,
  hasPermission,
  replaceUserLocationAccess,
} from "@/modules/identity-access/service";

type Params = { params: Promise<{ kitchenAdminId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "kitchen_admins.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { kitchenAdminId } = await params;
  const managedKitchenAdmin = await getManagedKitchenAdminContextForManager(
    user.id,
    kitchenAdminId
  );
  if (!managedKitchenAdmin) {
    return NextResponse.json({ error: "Kitchen admin not found in your team." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = replaceLocationAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const requestedLocationIds = Array.from(new Set(parsed.data.locationIds));
  const unscopedLocationIds = requestedLocationIds.filter(
    (locationId) => !user.locationIds.includes(locationId)
  );
  if (unscopedLocationIds.length > 0) {
    return NextResponse.json(
      { error: "You can only assign locations you already manage." },
      { status: 403 }
    );
  }

  const locations = await getLocationsByIds(requestedLocationIds);
  if (locations.length !== requestedLocationIds.length) {
    return NextResponse.json(
      { error: "One or more locations are invalid or inactive." },
      { status: 400 }
    );
  }

  const updatedLocationAccess = await replaceUserLocationAccess(
    kitchenAdminId,
    requestedLocationIds
  );

  return NextResponse.json({
    kitchenAdminId: managedKitchenAdmin.id,
    locations: updatedLocationAccess.map((entry) => ({
      id: entry.location.id,
      name: entry.location.name,
    })),
  });
}
