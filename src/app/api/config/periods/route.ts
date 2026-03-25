import { NextRequest, NextResponse } from "next/server";
import { createTastingPeriodSchema } from "@/lib/validations";
import { getTastingPeriods, createTastingPeriod } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const periods = await getTastingPeriods();
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTastingPeriodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const period = await createTastingPeriod(parsed.data);
    createAuditEvent({
      entityType: "TastingPeriod",
      entityId: period.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(period, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
