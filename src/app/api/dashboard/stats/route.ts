import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/modules/identity-access/middleware";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [todaySessions, yesterdaySessions, todayPackets, weekSessions] = await Promise.all([
    prisma.tastingSession.findMany({
      where: { date: { gte: todayStart, lt: todayEnd } },
      select: { status: true },
    }),
    prisma.tastingSession.findMany({
      where: { date: { gte: yesterdayStart, lt: todayStart } },
      select: { status: true },
    }),
    prisma.menuSignagePacket.findMany({
      where: { date: { gte: todayStart, lt: todayEnd } },
      select: { status: true },
    }),
    (() => {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      return prisma.tastingSession.findMany({
        where: { date: { gte: weekStart, lt: todayEnd } },
        select: { date: true, status: true },
      });
    })(),
  ]);

  const countByStatus = (items: { status: string }[]) => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  };

  const todayStatus = countByStatus(todaySessions);
  const yesterdayTotal = yesterdaySessions.length;

  const reviewed = todayStatus["reviewed"] || 0;
  const locked = todayStatus["locked"] || 0;
  const todayCompliance =
    todaySessions.length > 0 ? Math.round(((reviewed + locked) / todaySessions.length) * 100) : 0;

  const pendingReviews = todayStatus["submitted"] || 0;
  const activePackets = todayPackets.filter(
    (p) => !["finalized_for_service", "completed"].includes(p.status)
  ).length;

  const weekData: { date: string; total: number; compliant: number; rate: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const daySessions = weekSessions.filter((s) => {
      const sd = new Date(s.date).toISOString().split("T")[0];
      return sd === dateStr;
    });
    const dayTotal = daySessions.length;
    const dayCompliant = daySessions.filter(
      (s) => s.status === "reviewed" || s.status === "locked"
    ).length;
    weekData.push({
      date: dateStr,
      total: dayTotal,
      compliant: dayCompliant,
      rate: dayTotal > 0 ? Math.round((dayCompliant / dayTotal) * 100) : 0,
    });
  }

  return NextResponse.json({
    today: {
      total: todaySessions.length,
      draft: todayStatus["draft"] || 0,
      submitted: todayStatus["submitted"] || 0,
      reviewed,
      locked,
    },
    complianceRate: todayCompliance,
    pendingReviews,
    activePackets,
    yesterdayTotal,
    weekTrend: weekData,
    packetStatus: countByStatus(todayPackets),
  });
}
