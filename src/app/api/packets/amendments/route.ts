import { NextRequest, NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-errors";
import { requireAnyPermission } from "@/modules/identity-access/middleware";
import { getPendingAmendmentsByLocations } from "@/modules/menu-signage/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAnyPermission([
    "packets.resolve_amendment",
    "reports.view",
    "tastings.view_all",
  ]);
  if (error) return error;

  const dateFrom = req.nextUrl.searchParams.get("dateFrom") ?? undefined;
  const locationIds = user!.locationIds;

  try {
    const amendments = await getPendingAmendmentsByLocations(locationIds, dateFrom);
    return NextResponse.json(amendments);
  } catch (err) {
    return handleServiceError(err);
  }
}
