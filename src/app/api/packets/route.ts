import { NextRequest, NextResponse } from "next/server";
import { createMenuSignagePacketSchema } from "@/lib/validations";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import type { EffectiveUserContext } from "@/modules/identity-access/types";
import {
  getManagedKitchenAdminContextForManager,
  hasAnyPermission,
  hasPermission,
} from "@/modules/identity-access/service";
import { createMenuSignagePacket, listMenuSignagePackets } from "@/modules/menu-signage/service";

async function resolveScopedLocationIds(user: EffectiveUserContext, viewAsKitchenAdminId?: string) {
  if (!viewAsKitchenAdminId) {
    return {
      locationIds: user.locationIds,
      viewAsKitchenAdminId: undefined,
    };
  }

  if (!hasPermission(user, "kitchen_admins.view_as")) {
    return null;
  }

  const managedKitchenAdmin = await getManagedKitchenAdminContextForManager(
    user.id,
    viewAsKitchenAdminId
  );
  if (!managedKitchenAdmin) {
    return null;
  }

  return {
    locationIds: managedKitchenAdmin.locationIds,
    viewAsKitchenAdminId,
  };
}

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

  const scoped = await resolveScopedLocationIds(
    user,
    search.get("viewAsKitchenAdminId") ?? undefined
  );
  if (!scoped) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  const packets = await listMenuSignagePackets(
    filters,
    hasGlobalAccess ? undefined : scoped.locationIds
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

  const scoped = await resolveScopedLocationIds(
    user,
    typeof body?.viewAsKitchenAdminId === "string" ? body.viewAsKitchenAdminId : undefined
  );
  if (!scoped) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!hasGlobalAccess && !scoped.locationIds.includes(parsed.data.locationId)) {
    return NextResponse.json(
      { error: "You can only create packets for your assigned locations." },
      { status: 403 }
    );
  }

  try {
    const packet = await createMenuSignagePacket(user.id, parsed.data);
    if (!packet) {
      return NextResponse.json({ error: "Failed to create packet" }, { status: 500 });
    }
    createAuditEvent({
      entityType: "MenuSignagePacket",
      entityId: packet.id,
      action: "packet_created",
      actorId: user.id,
      actorName: user.name,
      metadata: {
        mode: "create",
        viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
        locationId: packet.locationId,
        meal: packet.meal,
      },
    }).catch(() => {});
    return NextResponse.json(packet, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
