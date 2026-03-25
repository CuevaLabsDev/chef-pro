import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { CreateAuditEventInput } from "./types";

export async function createAuditEvent(input: CreateAuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      actorName: input.actorName,
      fieldName: input.fieldName,
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function getAuditEventsForEntity(entityType: string, entityId: string) {
  return prisma.auditEvent.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentAuditEvents(limit = 50) {
  return prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
