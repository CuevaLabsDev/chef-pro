import { NextRequest, NextResponse } from "next/server";
import { updateTastingSessionSchema } from "@/lib/validations";
import {
  getTastingSession,
  updateTastingSession,
  submitTastingSession,
} from "@/modules/tasting-capture/service";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { ensureSubscriptions } from "@/modules/events/subscriptions";

ensureSubscriptions();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const { id } = await params;
  const tasting = await getTastingSession(id);
  if (!tasting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canViewAll = hasAnyPermission(user, ["tastings.view_all", "reviews.manage"]);
  const canAccessTastings = hasAnyPermission(user, [
    "tastings.create",
    "tastings.edit",
    "tastings.submit",
  ]);
  const isAtLocation = user.locationIds.includes(tasting.locationId);
  if (!canViewAll && !(canAccessTastings && isAtLocation)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(tasting);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const { id } = await params;
  const tasting = await getTastingSession(id);
  if (!tasting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canViewAll = hasAnyPermission(user, ["tastings.view_all", "reviews.manage"]);
  const isAtLocation = user.locationIds.includes(tasting.locationId);
  const body = await req.json();

  if (body.action === "submit") {
    if (!hasPermission(user, "tastings.submit") || (!canViewAll && !isAtLocation)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const submitted = await submitTastingSession(id, user.id);
      return NextResponse.json(submitted);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = updateTastingSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasPermission(user, "tastings.edit") || (!canViewAll && !isAtLocation)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await updateTastingSession(id, user.id, parsed.data);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
