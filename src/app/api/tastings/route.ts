import { NextRequest, NextResponse } from "next/server";
import { createTastingSessionSchema } from "@/lib/validations";
import {
  createTastingSession,
  getTastingSessionsByChef,
  getTastingSessionsFiltered,
} from "@/modules/tasting-capture/service";
import { hasAnyPermission, hasPermission } from "@/modules/identity-access/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { ensureSubscriptions } from "@/modules/events/subscriptions";

ensureSubscriptions();

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const params = req.nextUrl.searchParams;

  if (hasPermission(user, "tastings.view_all")) {
    const sessions = await getTastingSessionsFiltered({
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      locationId: params.get("locationId") ?? undefined,
      chefId: params.get("chefId") ?? undefined,
      periodId: params.get("periodId") ?? undefined,
      status: params.get("status") ?? undefined,
    });
    return NextResponse.json(sessions);
  }

  if (hasAnyPermission(user, ["tastings.create", "tastings.edit", "tastings.submit"])) {
    const sessions = await getTastingSessionsByChef(user.id, {
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      locationId: params.get("locationId") ?? undefined,
    });
    return NextResponse.json(sessions);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "tastings.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTastingSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const tasting = await createTastingSession(user.id, parsed.data);
    return NextResponse.json(tasting, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
