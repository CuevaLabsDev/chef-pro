import { NextRequest, NextResponse } from "next/server";
import { createMenuSignagePacketSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import { createMenuSignagePacket, listMenuSignagePackets } from "@/modules/menu-signage/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "packets.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams;
  const filters = {
    dateFrom: search.get("dateFrom") ?? undefined,
    dateTo: search.get("dateTo") ?? undefined,
    locationId: search.get("locationId") ?? undefined,
    meal: search.get("meal") ?? undefined,
    status: search.get("status") ?? undefined,
    assignedChefId: search.get("assignedChefId") ?? undefined,
  };

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  const packets = await listMenuSignagePackets(
    filters,
    hasGlobalAccess ? undefined : user.locationIds
  );

  return NextResponse.json(packets);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "packets.manage_structure")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createMenuSignagePacketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const packet = await createMenuSignagePacket(user.id, parsed.data);
    return NextResponse.json(packet, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
