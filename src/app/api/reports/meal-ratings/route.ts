import { NextRequest, NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-errors";
import { requireAnyPermission } from "@/modules/identity-access/middleware";
import { getLocationMealRatings } from "@/modules/tasting-capture/service";

export async function GET(req: NextRequest) {
  const { error } = await requireAnyPermission(["reports.view", "tastings.view_all"]);
  if (error) return error;

  const url = req.nextUrl;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const locationId = url.searchParams.get("locationId") ?? undefined;

  try {
    const ratings = await getLocationMealRatings({ dateFrom, dateTo, locationId });
    return NextResponse.json(ratings);
  } catch (err) {
    return handleServiceError(err);
  }
}
