import { NextRequest, NextResponse } from "next/server";
import { updateMenuSignagePacketSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import {
  deleteMenuSignagePacket,
  getMenuSignagePacket,
  updateMenuSignagePacketExecution,
  updateMenuSignagePacketStructure,
} from "@/modules/menu-signage/service";

function canAccessPacketLocation(
  user: { locationIds: string[] },
  packetLocationId: string,
  hasGlobalAccess: boolean
) {
  if (hasGlobalAccess) return true;
  return user.locationIds.includes(packetLocationId);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "packets.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const packet = await getMenuSignagePacket(id);
  if (!packet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!canAccessPacketLocation(user, packet.locationId, hasGlobalAccess)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(packet);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "packets.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const packet = await getMenuSignagePacket(id);
  if (!packet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!canAccessPacketLocation(user, packet.locationId, hasGlobalAccess)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateMenuSignagePacketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.mode === "structure") {
      if (!hasGlobalAccess && !hasPermission(user, "packets.manage_structure")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await updateMenuSignagePacketStructure(id, parsed.data.data);
      return NextResponse.json(updated);
    }

    if (!hasGlobalAccess && !hasPermission(user, "packets.execute")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await updateMenuSignagePacketExecution(id, parsed.data.data);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!hasGlobalAccess && !hasPermission(user, "packets.manage_structure")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const packet = await getMenuSignagePacket(id);
  if (!packet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessPacketLocation(user, packet.locationId, hasGlobalAccess)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteMenuSignagePacket(id);
  return NextResponse.json({ success: true });
}
