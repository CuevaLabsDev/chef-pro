import { NextRequest, NextResponse } from "next/server";
import { createPacketAmendmentSchema } from "@/lib/validations";
import { handleServiceError } from "@/lib/api-errors";
import { requirePermission } from "@/modules/identity-access/middleware";
import { createPacketAmendment, getPacketAmendments } from "@/modules/menu-signage/service";
import { createAuditEvent } from "@/modules/audit/service";
import { ensureSubscriptions } from "@/modules/events/subscriptions";

ensureSubscriptions();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("packets.read");
  if (error) return error;

  const { id } = await params;

  try {
    const amendments = await getPacketAmendments(id);
    return NextResponse.json(amendments);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requirePermission("packets.request_amendment");
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = createPacketAmendmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  try {
    const amendment = await createPacketAmendment(id, user!.id, parsed.data);

    createAuditEvent({
      entityType: "PacketAmendment",
      entityId: amendment.id,
      action: "created",
      actorId: user!.id,
      actorName: user!.name,
      metadata: { packetId: id, type: parsed.data.type, reason: parsed.data.reason },
    }).catch(() => {});

    return NextResponse.json(amendment, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
