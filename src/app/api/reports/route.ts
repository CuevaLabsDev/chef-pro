import { NextRequest, NextResponse } from "next/server";
import { getComplianceSummary } from "@/modules/review-compliance/service";
import { getTastingSessionsFiltered } from "@/modules/tasting-capture/service";
import { listMenuSignagePackets } from "@/modules/menu-signage/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "reports.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const type = params.get("type") ?? "compliance";
  const dateFrom =
    params.get("dateFrom") ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const dateTo = params.get("dateTo") ?? new Date().toISOString().split("T")[0];

  if (type === "compliance") {
    const summary = await getComplianceSummary(dateFrom, dateTo);
    return NextResponse.json(summary);
  }

  if (type === "export") {
    const sessions = await getTastingSessionsFiltered({
      dateFrom,
      dateTo,
      locationId: params.get("locationId") ?? undefined,
      chefId: params.get("chefId") ?? undefined,
      periodId: params.get("periodId") ?? undefined,
      status: params.get("status") ?? undefined,
    });

    const csvRows = [
      [
        "Date",
        "Location",
        "Period",
        "Chef",
        "Dish",
        "Status",
        "Flavor",
        "Texture",
        "Presentation",
        "Temperature",
        "Adjustments",
      ].join(","),
    ];

    for (const s of sessions) {
      for (const item of s.items) {
        const ratings = item.ratings;
        csvRows.push(
          [
            new Date(s.date).toISOString().split("T")[0],
            s.location.name,
            s.tastingPeriod.name,
            s.chef?.name ?? "Unassigned",
            `"${item.dishName.replace(/"/g, '""')}"`,
            s.status,
            ratings[0]?.numericValue ?? "",
            ratings[1]?.numericValue ?? "",
            ratings[2]?.numericValue ?? "",
            item.temperatureCompliance,
            `"${(item.adjustmentsNeeded ?? "").replace(/"/g, '""')}"`,
          ].join(",")
        );
      }
    }

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="chefpro-export-${dateFrom}-${dateTo}.csv"`,
      },
    });
  }

  if (type === "packet_export") {
    const packets = await listMenuSignagePackets({
      dateFrom,
      dateTo,
      locationId: params.get("locationId") ?? undefined,
      meal: params.get("meal") ?? undefined,
      status: params.get("status") ?? undefined,
    });

    const csvRows = [
      [
        "Date",
        "Cafe",
        "Meal",
        "Packet Status",
        "Category",
        "Item Name",
        "Ingredients",
        "Theme",
        "Diet Tags",
        "Allergens",
        "Ready",
        "Used",
      ].join(","),
    ];

    for (const packet of packets) {
      for (const item of packet.items) {
        csvRows.push(
          [
            new Date(packet.date).toISOString().split("T")[0],
            packet.location.name,
            packet.meal,
            packet.status,
            item.category,
            `"${item.itemName.replace(/"/g, '""')}"`,
            `"${item.ingredients.replace(/"/g, '""')}"`,
            `"${(item.theme ?? "").replace(/"/g, '""')}"`,
            `"${item.dietTags.join(", ").replace(/"/g, '""')}"`,
            `"${item.allergenTags.join(", ").replace(/"/g, '""')}"`,
            item.isReadyForService ? "yes" : "no",
            item.wasUsed ? "yes" : "no",
          ].join(",")
        );
      }
    }

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="chefpro-packets-${dateFrom}-${dateTo}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
