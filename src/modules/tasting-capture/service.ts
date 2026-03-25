import { prisma } from "@/lib/db";
import { eventBus } from "@/modules/events/bus";
import type { CreateTastingSessionInput, UpdateTastingSessionInput } from "./types";

export async function createTastingSession(chefId: string, input: CreateTastingSessionInput) {
  const session = await prisma.tastingSession.create({
    data: {
      date: new Date(input.date),
      locationId: input.locationId,
      tastingPeriodId: input.tastingPeriodId,
      ...(input.menuSignagePacketId
        ? {
            menuSignagePacket: {
              connect: { id: input.menuSignagePacketId },
            },
          }
        : {}),
      chefId,
      checklistMenuPackage: input.checklistMenuPackage ?? false,
      checklistDigitalSignage: input.checklistDigitalSignage ?? false,
      checklistFoodCards: input.checklistFoodCards ?? false,
      checklistNotes: input.checklistNotes,
      status: "draft",
      items: {
        create: input.items.map((item) => ({
          dishName: item.dishName,
          sortOrder: item.sortOrder,
          temperatureCompliance: item.temperatureCompliance,
          adjustmentsNeeded: item.adjustmentsNeeded,
          serviceGapMins: item.serviceGapMins,
          ratings: {
            create: item.ratings.map((r) => ({
              questionId: r.questionId,
              numericValue: r.numericValue,
              textValue: r.textValue,
            })),
          },
        })),
      },
    },
    include: {
      items: { include: { ratings: true } },
      location: true,
      tastingPeriod: true,
      menuSignagePacket: {
        select: { id: true, meal: true, status: true },
      },
    },
  });

  await eventBus.publish("session_created", chefId, session.id, "TastingSession", {
    sessionId: session.id,
  });

  return session;
}

export async function updateTastingSession(
  sessionId: string,
  actorId: string,
  input: UpdateTastingSessionInput
) {
  const existing = await prisma.tastingSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { items: { include: { ratings: true } } },
  });

  if (existing.status === "locked") {
    throw new Error("Cannot edit a locked session");
  }

  const isPostSubmit = existing.status === "submitted" || existing.status === "reviewed";

  if (input.items) {
    await prisma.tastingItem.deleteMany({ where: { sessionId } });
  }

  const updated = await prisma.tastingSession.update({
    where: { id: sessionId },
    data: {
      checklistMenuPackage: input.checklistMenuPackage ?? existing.checklistMenuPackage,
      checklistDigitalSignage: input.checklistDigitalSignage ?? existing.checklistDigitalSignage,
      checklistFoodCards: input.checklistFoodCards ?? existing.checklistFoodCards,
      checklistNotes: input.checklistNotes ?? existing.checklistNotes,
      ...(input.menuSignagePacketId === undefined
        ? {}
        : input.menuSignagePacketId
          ? {
              menuSignagePacket: {
                connect: { id: input.menuSignagePacketId },
              },
            }
          : {
              menuSignagePacket: {
                disconnect: true,
              },
            }),
      ...(input.items
        ? {
            items: {
              create: input.items.map((item) => ({
                dishName: item.dishName,
                sortOrder: item.sortOrder,
                temperatureCompliance: item.temperatureCompliance,
                adjustmentsNeeded: item.adjustmentsNeeded,
                serviceGapMins: item.serviceGapMins,
                ratings: {
                  create: item.ratings.map((r) => ({
                    questionId: r.questionId,
                    numericValue: r.numericValue,
                    textValue: r.textValue,
                  })),
                },
              })),
            },
          }
        : {}),
    },
    include: {
      items: { include: { ratings: true } },
      location: true,
      tastingPeriod: true,
      menuSignagePacket: {
        select: { id: true, meal: true, status: true },
      },
    },
  });

  if (isPostSubmit) {
    await eventBus.publish("session_edited_post_submit", actorId, sessionId, "TastingSession", {
      sessionId,
      previousStatus: existing.status,
    });
  }

  return updated;
}

export async function submitTastingSession(sessionId: string, chefId: string) {
  const chef = await prisma.user.findUnique({ where: { id: chefId }, select: { name: true } });

  const session = await prisma.$transaction(async (tx) => {
    const updated = await tx.tastingSession.update({
      where: { id: sessionId },
      data: { status: "submitted", submittedAt: new Date() },
      include: {
        items: { include: { ratings: true } },
        location: true,
        tastingPeriod: true,
        menuSignagePacket: {
          select: { id: true, meal: true, status: true },
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        entityType: "TastingSession",
        entityId: sessionId,
        action: "submitted",
        actorId: chefId,
        actorName: chef?.name ?? "Unknown",
        metadata: { sessionId, status: "submitted" },
      },
    });

    return updated;
  });

  await eventBus.publish("session_submitted", chefId, sessionId, "TastingSession", { sessionId });

  for (const item of session.items) {
    const starRatings = item.ratings.filter((r) => r.numericValue != null);
    if (starRatings.length === 0) continue;
    const avg = starRatings.reduce((sum, r) => sum + (r.numericValue ?? 0), 0) / starRatings.length;
    if (avg <= 2 || avg >= 4) {
      eventBus
        .publish("tasting_score_notable", chefId, item.id, "TastingItem", {
          level: avg <= 2 ? "low" : "high",
          dishName: item.dishName,
          avgRating: Math.round(avg * 10) / 10,
          locationName: session.location.name,
          period: session.tastingPeriod.name,
          sessionId,
        })
        .catch(() => {});
    }
  }

  return session;
}

export async function getTastingSession(id: string) {
  return prisma.tastingSession.findUnique({
    where: { id },
    include: {
      items: {
        include: { ratings: { include: { question: true } } },
        orderBy: { sortOrder: "asc" },
      },
      location: true,
      tastingPeriod: true,
      menuSignagePacket: {
        select: { id: true, meal: true, status: true },
      },
      chef: { select: { id: true, name: true, email: true } },
      reviewActions: {
        include: { reviewer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getTastingSessionsByChef(
  chefId: string,
  filters?: { dateFrom?: string; dateTo?: string; locationId?: string }
) {
  return prisma.tastingSession.findMany({
    where: {
      chefId,
      ...(filters?.dateFrom && { date: { gte: new Date(filters.dateFrom) } }),
      ...(filters?.dateTo && { date: { lte: new Date(filters.dateTo) } }),
      ...(filters?.locationId && { locationId: filters.locationId }),
    },
    include: {
      items: { include: { ratings: true } },
      location: true,
      tastingPeriod: true,
      menuSignagePacket: {
        select: { id: true, meal: true, status: true },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getTastingSessionsByLocations(
  locationIds: string[],
  filters?: { dateFrom?: string; dateTo?: string }
) {
  return prisma.tastingSession.findMany({
    where: {
      locationId: { in: locationIds },
      ...(filters?.dateFrom && { date: { gte: new Date(filters.dateFrom) } }),
      ...(filters?.dateTo && { date: { lte: new Date(filters.dateTo) } }),
    },
    include: {
      items: { include: { ratings: true } },
      location: true,
      tastingPeriod: true,
      menuSignagePacket: {
        select: { id: true, meal: true, status: true },
      },
      chef: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getLocationMealRatings(filters: {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
}) {
  const sessions = await prisma.tastingSession.findMany({
    where: {
      status: { in: ["submitted", "reviewed", "locked"] },
      ...(filters.dateFrom && { date: { gte: new Date(filters.dateFrom) } }),
      ...(filters.dateTo && { date: { lte: new Date(filters.dateTo) } }),
      ...(filters.locationId && { locationId: filters.locationId }),
    },
    include: {
      items: { include: { ratings: true } },
      location: { select: { id: true, name: true } },
      tastingPeriod: { select: { id: true, name: true } },
    },
  });

  const buckets: Record<
    string,
    { locationId: string; locationName: string; period: string; totalRating: number; count: number }
  > = {};

  for (const session of sessions) {
    const key = `${session.locationId}:${session.tastingPeriod.name}`;
    if (!buckets[key]) {
      buckets[key] = {
        locationId: session.location.id,
        locationName: session.location.name,
        period: session.tastingPeriod.name,
        totalRating: 0,
        count: 0,
      };
    }
    for (const item of session.items) {
      const stars = item.ratings.filter((r) => r.numericValue != null);
      for (const r of stars) {
        buckets[key].totalRating += r.numericValue!;
        buckets[key].count += 1;
      }
    }
  }

  return Object.values(buckets).map((b) => ({
    locationId: b.locationId,
    locationName: b.locationName,
    period: b.period,
    avgRating: b.count > 0 ? Math.round((b.totalRating / b.count) * 10) / 10 : null,
    ratingCount: b.count,
  }));
}

export async function getTastingSessionsFiltered(filters: {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  chefId?: string;
  periodId?: string;
  status?: string;
}) {
  return prisma.tastingSession.findMany({
    where: {
      ...(filters.dateFrom && { date: { gte: new Date(filters.dateFrom) } }),
      ...(filters.dateTo && { date: { lte: new Date(filters.dateTo) } }),
      ...(filters.locationId && { locationId: filters.locationId }),
      ...(filters.chefId && { chefId: filters.chefId }),
      ...(filters.periodId && { tastingPeriodId: filters.periodId }),
      ...(filters.status && {
        status: filters.status as "draft" | "submitted" | "reviewed" | "locked",
      }),
    },
    include: {
      items: { include: { ratings: true } },
      location: true,
      tastingPeriod: true,
      menuSignagePacket: {
        select: { id: true, meal: true, status: true },
      },
      chef: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: "desc" },
  });
}
