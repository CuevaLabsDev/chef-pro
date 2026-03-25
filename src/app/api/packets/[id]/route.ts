import { NextRequest, NextResponse } from "next/server";
import { updateMenuSignagePacketSchema } from "@/lib/validations";
import { createAuditEvent } from "@/modules/audit/service";
import { diffPacketStructure } from "@/modules/audit/diff";
import { handleServiceError } from "@/lib/api-errors";
import { requireAuth } from "@/modules/identity-access/middleware";
import type { EffectiveUserContext } from "@/modules/identity-access/types";
import {
  getManagedKitchenAdminContextForManager,
  hasAnyPermission,
  hasPermission,
} from "@/modules/identity-access/service";
import {
  addPacketReviewSignature,
  deleteMenuSignagePacket,
  finalizePacketForService,
  getMenuSignagePacket,
  publishMenuSignagePacket,
  submitPacketForFinalReview,
  updateMenuSignagePacketExecution,
  updateMenuSignagePacketStructure,
} from "@/modules/menu-signage/service";

function canAccessPacketLocation(
  locationIds: string[],
  packetLocationId: string,
  hasGlobalAccess: boolean
) {
  if (hasGlobalAccess) return true;
  return locationIds.includes(packetLocationId);
}

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
  if (!managedKitchenAdmin) return null;

  return {
    locationIds: managedKitchenAdmin.locationIds,
    viewAsKitchenAdminId,
  };
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

  const scoped = await resolveScopedLocationIds(
    user,
    _req.nextUrl.searchParams.get("viewAsKitchenAdminId") ?? undefined
  );
  if (!scoped) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!canAccessPacketLocation(scoped.locationIds, packet.locationId, hasGlobalAccess)) {
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

  const body = await req.json();
  const scoped = await resolveScopedLocationIds(
    user,
    typeof body?.viewAsKitchenAdminId === "string" ? body.viewAsKitchenAdminId : undefined
  );
  if (!scoped) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasGlobalAccess = hasAnyPermission(user, ["packets.override", "reviews.manage"]);
  if (!canAccessPacketLocation(scoped.locationIds, packet.locationId, hasGlobalAccess)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateMenuSignagePacketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.mode === "structure") {
      const canManageStructure = hasPermission(user, "packets.manage_structure");
      const canReviewerEdit =
        hasPermission(user, "packets.execute") &&
        ["published", "for_final_review"].includes(packet.status);
      if (!hasGlobalAccess && !canManageStructure && !canReviewerEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (
        parsed.data.data.locationId &&
        !hasGlobalAccess &&
        !scoped.locationIds.includes(parsed.data.data.locationId)
      ) {
        return NextResponse.json(
          { error: "You can only move packets into your assigned locations." },
          { status: 403 }
        );
      }

      const changes = diffPacketStructure(
        { date: packet.date, meal: packet.meal, theme: packet.theme, items: packet.items },
        parsed.data.data
      );

      const updated = await updateMenuSignagePacketStructure(id, parsed.data.data);

      if (changes.length > 0) {
        const firstChange = changes[0];
        createAuditEvent({
          entityType: "MenuSignagePacket",
          entityId: id,
          action: "packet_structure_updated",
          actorId: user.id,
          actorName: user.name,
          fieldName: firstChange.fieldName,
          oldValue: firstChange.oldValue,
          newValue: firstChange.newValue,
          metadata: {
            mode: "structure",
            viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
            changes,
          },
        }).catch(() => {});
      } else {
        createAuditEvent({
          entityType: "MenuSignagePacket",
          entityId: id,
          action: "packet_structure_updated",
          actorId: user.id,
          actorName: user.name,
          metadata: {
            mode: "structure",
            viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
          },
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    }

    if (parsed.data.mode === "execution") {
      if (!hasGlobalAccess && !hasPermission(user, "packets.execute")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await updateMenuSignagePacketExecution(id, parsed.data.data);
      createAuditEvent({
        entityType: "MenuSignagePacket",
        entityId: id,
        action: "packet_execution_updated",
        actorId: user.id,
        actorName: user.name,
        metadata: {
          mode: "execution",
          viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
        },
      }).catch(() => {});
      return NextResponse.json(updated);
    }

    if (parsed.data.mode === "publish") {
      if (!hasGlobalAccess && !hasPermission(user, "packets.publish")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await publishMenuSignagePacket(id, user.id);
      createAuditEvent({
        entityType: "MenuSignagePacket",
        entityId: id,
        action: "packet_published",
        actorId: user.id,
        actorName: user.name,
        metadata: {
          mode: "publish",
          note: parsed.data.data.note ?? null,
          viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
        },
      }).catch(() => {});
      return NextResponse.json(updated);
    }

    if (parsed.data.mode === "submit_for_final_review") {
      const canSubmitForFinalReview =
        hasPermission(user, "packets.execute") || hasPermission(user, "packets.manage_structure");
      if (!hasGlobalAccess && !canSubmitForFinalReview) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await submitPacketForFinalReview(id, user.id);
      createAuditEvent({
        entityType: "MenuSignagePacket",
        entityId: id,
        action: "packet_sent_for_final_review",
        actorId: user.id,
        actorName: user.name,
        metadata: {
          mode: "submit_for_final_review",
          note: parsed.data.data.note ?? null,
          viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
        },
      }).catch(() => {});
      return NextResponse.json(updated);
    }

    if (parsed.data.mode === "add_signature") {
      const updated = await addPacketReviewSignature(
        id,
        { id: user.id, name: user.name, role: user.role },
        parsed.data.data
      );
      createAuditEvent({
        entityType: "MenuSignagePacket",
        entityId: id,
        action: "packet_signature_added",
        actorId: user.id,
        actorName: user.name,
        metadata: {
          mode: "add_signature",
          typedName: parsed.data.data.typedName,
          viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
        },
      }).catch(() => {});
      return NextResponse.json(updated);
    }

    if (!hasGlobalAccess && !hasPermission(user, "packets.finalize_service")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await finalizePacketForService(
      id,
      { id: user.id, name: user.name, role: user.role },
      parsed.data.data
    );
    createAuditEvent({
      entityType: "MenuSignagePacket",
      entityId: id,
      action: "packet_finalized_for_service",
      actorId: user.id,
      actorName: user.name,
      metadata: {
        mode: "finalize_for_service",
        note: parsed.data.data.note ?? null,
        typedName: parsed.data.data.typedName,
        viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return handleServiceError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const scoped = await resolveScopedLocationIds(
    user,
    req.nextUrl.searchParams.get("viewAsKitchenAdminId") ?? undefined
  );
  if (!scoped) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canAccessPacketLocation(scoped.locationIds, packet.locationId, hasGlobalAccess)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteMenuSignagePacket(id);
  createAuditEvent({
    entityType: "MenuSignagePacket",
    entityId: id,
    action: "packet_deleted",
    actorId: user.id,
    actorName: user.name,
    metadata: {
      mode: "delete",
      viewAsKitchenAdminId: scoped.viewAsKitchenAdminId ?? null,
    },
  }).catch(() => {});
  return NextResponse.json({ success: true });
}
