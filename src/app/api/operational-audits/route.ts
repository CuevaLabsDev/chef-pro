import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { listAudits } from "@/modules/operational-compliance/service";

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  try {
    const params = req.nextUrl.searchParams;
    const audits = await listAudits(
      {
        locationId: params.get("locationId"),
        dateFrom: params.get("dateFrom"),
        dateTo: params.get("dateTo"),
        type: params.get("type"),
        status: params.get("status"),
      },
      user
    );
    return NextResponse.json(audits);
  } catch (err) {
    return toErrorResponse(err);
  }
}
