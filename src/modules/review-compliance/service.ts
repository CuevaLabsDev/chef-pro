import { prisma } from "@/lib/db";
import { eventBus } from "@/modules/events/bus";
import type { SessionStatus } from "@/modules/tasting-capture/types";
import type { TransitionSessionInput } from "./types";

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ["submitted"],
  submitted: ["reviewed", "locked"],
  reviewed: ["locked"],
  locked: [],
};

export async function transitionSession(input: TransitionSessionInput, reviewerId: string) {
  const session = await prisma.tastingSession.findUniqueOrThrow({
    where: { id: input.sessionId },
  });

  const allowed = VALID_TRANSITIONS[session.status as SessionStatus];
  if (!allowed?.includes(input.toStatus as SessionStatus)) {
    throw new Error(`Cannot transition from ${session.status} to ${input.toStatus}`);
  }

  const [updated] = await prisma.$transaction([
    prisma.tastingSession.update({
      where: { id: input.sessionId },
      data: { status: input.toStatus },
      include: {
        items: { include: { ratings: true } },
        location: true,
        tastingPeriod: true,
        chef: { select: { id: true, name: true } },
      },
    }),
    prisma.reviewAction.create({
      data: {
        sessionId: input.sessionId,
        reviewerId,
        fromStatus: session.status,
        toStatus: input.toStatus,
        notes: input.notes,
      },
    }),
  ]);

  const eventType =
    input.toStatus === "reviewed"
      ? "session_reviewed"
      : input.toStatus === "locked"
        ? "session_locked"
        : undefined;

  if (eventType) {
    await eventBus.publish(eventType, reviewerId, input.sessionId, "TastingSession", {
      sessionId: input.sessionId,
      fromStatus: session.status,
      toStatus: input.toStatus,
    });
  }

  return updated;
}

export async function unlockSession(sessionId: string, reviewerId: string) {
  const session = await prisma.tastingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (session.status !== "locked") {
    throw new Error("Session is not locked");
  }

  const [updated] = await prisma.$transaction([
    prisma.tastingSession.update({
      where: { id: sessionId },
      data: { status: "submitted" },
    }),
    prisma.reviewAction.create({
      data: {
        sessionId,
        reviewerId,
        fromStatus: "locked",
        toStatus: "submitted",
        notes: "Session unlocked by admin",
      },
    }),
  ]);

  await eventBus.publish("session_unlocked", reviewerId, sessionId, "TastingSession", {
    sessionId,
  });

  return updated;
}

export async function getComplianceSummary(dateFrom: string, dateTo: string) {
  const sessions = await prisma.tastingSession.findMany({
    where: {
      date: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    },
    include: { location: true, tastingPeriod: true },
  });

  const deadlines = await prisma.deadlineRule.findMany({
    where: { isActive: true },
    include: { location: true, tastingPeriod: true },
  });

  const summaryMap = new Map<
    string,
    {
      locationId: string;
      locationName: string;
      periodId: string;
      periodName: string;
      totalExpected: number;
      totalSubmitted: number;
      totalReviewed: number;
      totalLate: number;
      totalMissing: number;
    }
  >();

  for (const dl of deadlines) {
    const key = `${dl.locationId}-${dl.tastingPeriodId}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        locationId: dl.locationId,
        locationName: dl.location.name,
        periodId: dl.tastingPeriodId,
        periodName: dl.tastingPeriod.name,
        totalExpected: 0,
        totalSubmitted: 0,
        totalReviewed: 0,
        totalLate: 0,
        totalMissing: 0,
      });
    }
  }

  for (const s of sessions) {
    const key = `${s.locationId}-${s.tastingPeriodId}`;
    const entry = summaryMap.get(key);
    if (entry) {
      if (s.status !== "draft") entry.totalSubmitted++;
      if (s.status === "reviewed" || s.status === "locked") entry.totalReviewed++;
    }
  }

  return Array.from(summaryMap.values()).map((s) => ({
    ...s,
    complianceRate:
      s.totalExpected > 0 ? Math.round((s.totalSubmitted / s.totalExpected) * 100) : 0,
  }));
}
