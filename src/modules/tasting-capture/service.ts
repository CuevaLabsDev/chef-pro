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
      managerName: input.managerName,
      menuName: input.menuName,
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
          ranOutTime: item.ranOutTime,
          serviceGapMins: item.serviceGapMins,
          backupNotes: item.backupNotes,
          fteNotes: item.fteNotes,
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
      managerName: input.managerName ?? existing.managerName,
      menuName: input.menuName ?? existing.menuName,
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
                ranOutTime: item.ranOutTime,
                serviceGapMins: item.serviceGapMins,
                backupNotes: item.backupNotes,
                fteNotes: item.fteNotes,
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
  const session = await prisma.tastingSession.update({
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

  await eventBus.publish("session_submitted", chefId, sessionId, "TastingSession", { sessionId });

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
