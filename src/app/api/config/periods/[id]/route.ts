import { NextRequest, NextResponse } from "next/server";
import { updateTastingPeriod } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const updated = await updateTastingPeriod(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const updated = await updateTastingPeriod(id, { isActive: false });
    return NextResponse.json(updated);
  } catch (err) {
    return handleServiceError(err);
  }
}
