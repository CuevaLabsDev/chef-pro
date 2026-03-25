import { NextRequest, NextResponse } from "next/server";
import { resolvePacketAmendmentSchema } from "@/lib/validations";
import { handleServiceError } from "@/lib/api-errors";
import { requirePermission } from "@/modules/identity-access/middleware";
import { resolvePacketAmendment } from "@/modules/menu-signage/service";
import { createAuditEvent } from "@/modules/audit/service";
import { ensureSubscriptions } from "@/modules/events/subscriptions";

ensureSubscriptions();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; amendmentId: string }> }
) {
  const { error, user } = await requirePermission("packets.resolve_amendment");
  if (error) return error;

  const { amendmentId } = await params;
  const body = await req.json();
  const parsed = resolvePacketAmendmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  try {
    const amendment = await resolvePacketAmendment(amendmentId, user!.id, parsed.data);

    createAuditEvent({
      entityType: "PacketAmendment",
      entityId: amendmentId,
      action: `amendment_${parsed.data.status}`,
      actorId: user!.id,
      actorName: user!.name,
    }).catch(() => {});

    return NextResponse.json(amendment);
  } catch (err) {
    return handleServiceError(err);
  }
}
