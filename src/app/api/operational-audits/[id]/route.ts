import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { getAuditDetail } from "@/modules/operational-compliance/service";

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  try {
    const { id } = await params;
    const audit = await getAuditDetail(id, user);
    return NextResponse.json(audit);
  } catch (err) {
    return toErrorResponse(err);
  }
}
