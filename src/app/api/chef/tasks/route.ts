import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasAnyPermission } from "@/modules/identity-access/service";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!hasAnyPermission(user, ["tastings.create", "tastings.edit", "tastings.submit"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const locationIds = user.locationIds;
  if (locationIds.length === 0) {
    return NextResponse.json({ tasks: [], metrics: { total: 0, completed: 0, pending: 0 } });
  }

  const [packets, sessions] = await Promise.all([
    prisma.menuSignagePacket.findMany({
      where: {
        locationId: { in: locationIds },
        date: { gte: dayStart, lt: dayEnd },
        status: { not: "draft" },
      },
      include: {
        location: { select: { name: true } },
      },
    }),
    prisma.tastingSession.findMany({
      where: {
        locationId: { in: locationIds },
        date: { gte: dayStart, lt: dayEnd },
      },
      include: {
        location: { select: { name: true } },
        tastingPeriod: { select: { name: true } },
        items: { select: { id: true } },
        chef: { select: { name: true } },
      },
    }),
  ]);

  const tasks: Record<string, unknown>[] = [];

  for (const packet of packets) {
    const completed =
      packet.checklistMenuPackage && packet.checklistDigitalSignage && packet.checklistFoodCards;

    tasks.push({
      type: "checklist",
      packetId: packet.id,
      locationName: packet.location.name,
      meal: packet.meal,
      completed,
      items: {
        menuPackage: packet.checklistMenuPackage,
        digitalSignage: packet.checklistDigitalSignage,
        foodCards: packet.checklistFoodCards,
      },
    });
  }

  for (const session of sessions) {
    const isCompleted = session.status !== "draft";

    tasks.push({
      type: "tasting",
      sessionId: session.id,
      locationName: session.location.name,
      meal: session.tastingPeriod.name,
      status: session.status,
      itemCount: session.items.length,
      filledBy: session.chef?.name ?? null,
    });
  }

  const completed = tasks.filter(
    (t) => (t.type === "checklist" && t.completed) || (t.type === "tasting" && t.status !== "draft")
  ).length;

  return NextResponse.json({
    tasks,
    metrics: {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
    },
  });
}
