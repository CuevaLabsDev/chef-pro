import { NextRequest, NextResponse } from "next/server";
import { getLocationsByIds } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  getManagedKitchenAdminSummaries,
  hasAnyPermission,
} from "@/modules/identity-access/service";
import { getPacketOverviewByLocations } from "@/modules/menu-signage/service";

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasAnyPermission(user, ["kitchen_admins.manage", "kitchen_admins.view_as"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const viewWindow = req.nextUrl.searchParams.get("window");
  const anchorDate = req.nextUrl.searchParams.get("date");
  const now = anchorDate ? new Date(anchorDate) : new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (viewWindow === "week") {
    start.setDate(start.getDate() - 6);
  }

  const managedKitchenAdmins = await getManagedKitchenAdminSummaries(user.id);
  const managerLocations = await getLocationsByIds(user.locationIds);

  const allManagedLocationIds = Array.from(
    new Set(managedKitchenAdmins.flatMap((entry) => entry.locationIds))
  );
  const packetOverview = await getPacketOverviewByLocations(allManagedLocationIds, {
    dateFrom: toIsoDate(start),
    dateTo: toIsoDate(end),
  });

  const managedWithOverview = managedKitchenAdmins.map((entry) => {
    const byStatus: Record<string, number> = {};
    let totalPackets = 0;

    for (const locationId of entry.locationIds) {
      const locationOverview = packetOverview.totalsByLocation[locationId];
      if (!locationOverview) continue;
      totalPackets += locationOverview.total;
      for (const [status, count] of Object.entries(locationOverview.byStatus)) {
        byStatus[status] = (byStatus[status] ?? 0) + count;
      }
    }

    return {
      ...entry,
      packetOverview: {
        total: totalPackets,
        byStatus,
      },
    };
  });

  return NextResponse.json({
    managedKitchenAdmins: managedWithOverview,
    managerLocations: managerLocations.map((location) => ({
      id: location.id,
      name: location.name,
    })),
    range: {
      dateFrom: toIsoDate(start),
      dateTo: toIsoDate(end),
      window: viewWindow === "week" ? "week" : "day",
    },
  });
}
