import { NextRequest, NextResponse } from "next/server";
import { getAuditEventsForEntity } from "@/modules/audit/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import type { EffectiveUserContext } from "@/modules/identity-access/types";
import {
  getManagedKitchenAdminContextForManager,
  hasAnyPermission,
  hasPermission,
} from "@/modules/identity-access/service";
import { getMenuSignagePacket } from "@/modules/menu-signage/service";

async function resolveScopedLocationIds(user: EffectiveUserContext, viewAsKitchenAdminId?: string) {
  if (!viewAsKitchenAdminId) return user.locationIds;
  if (!hasPermission(user, "kitchen_admins.view_as")) return null;

  const managedKitchenAdmin = await getManagedKitchenAdminContextForManager(
    user.id,
    viewAsKitchenAdminId
  );
  if (!managedKitchenAdmin) return null;
  return managedKitchenAdmin.locationIds;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const scopedLocationIds = await resolveScopedLocationIds(
    user,
    req.nextUrl.searchParams.get("viewAsKitchenAdminId") ?? undefined
  );
  if (!scopedLocationIds) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!hasGlobalAccess && !scopedLocationIds.includes(packet.locationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await getAuditEventsForEntity("MenuSignagePacket", id);
  return NextResponse.json(events);
}
