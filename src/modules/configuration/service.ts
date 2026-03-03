import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  CreateLocationInput,
  CreateTastingPeriodInput,
  CreateDeadlineRuleInput,
  CreateRatingSchemaInput,
} from "./types";

// ─── Locations ──────────────────────────────────────────────────────

export async function getLocations() {
  return prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getLocationById(id: string) {
  return prisma.location.findUnique({ where: { id } });
}

export async function createLocation(input: CreateLocationInput) {
  return prisma.location.create({
    data: { name: input.name, description: input.description },
  });
}

export async function updateLocation(
  id: string,
  data: Partial<CreateLocationInput & { isActive: boolean }>
) {
  return prisma.location.update({ where: { id }, data });
}

// ─── Tasting Periods ────────────────────────────────────────────────

export async function getTastingPeriods() {
  return prisma.tastingPeriod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createTastingPeriod(input: CreateTastingPeriodInput) {
  return prisma.tastingPeriod.create({
    data: { name: input.name, sortOrder: input.sortOrder },
  });
}

export async function updateTastingPeriod(
  id: string,
  data: Partial<CreateTastingPeriodInput & { isActive: boolean }>
) {
  return prisma.tastingPeriod.update({ where: { id }, data });
}

// ─── Deadline Rules ─────────────────────────────────────────────────

export async function getDeadlineRules() {
  return prisma.deadlineRule.findMany({
    where: { isActive: true },
    include: { location: true, tastingPeriod: true },
    orderBy: { location: { name: "asc" } },
  });
}

export async function createDeadlineRule(input: CreateDeadlineRuleInput) {
  return prisma.deadlineRule.create({
    data: {
      locationId: input.locationId,
      tastingPeriodId: input.tastingPeriodId,
      deadlineTime: input.deadlineTime,
      daysOfWeek: input.daysOfWeek.join(","),
    },
  });
}

export async function updateDeadlineRule(
  id: string,
  data: Partial<CreateDeadlineRuleInput & { isActive: boolean }>
) {
  const updateData: Prisma.DeadlineRuleUpdateInput = {
    ...(data.deadlineTime !== undefined ? { deadlineTime: data.deadlineTime } : {}),
    ...(data.daysOfWeek !== undefined ? { daysOfWeek: data.daysOfWeek.join(",") } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };

  return prisma.deadlineRule.update({ where: { id }, data: updateData });
}

// ─── Rating Schemas ─────────────────────────────────────────────────

export async function getActiveRatingSchema() {
  return prisma.ratingSchema.findFirst({
    where: { isActive: true },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { version: "desc" },
  });
}

export async function getRatingSchemas() {
  return prisma.ratingSchema.findMany({
    include: { questions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { version: "desc" },
  });
}

export async function createRatingSchema(input: CreateRatingSchemaInput) {
  await prisma.ratingSchema.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  return prisma.ratingSchema.create({
    data: {
      name: input.name,
      isActive: true,
      questions: {
        create: input.questions.map((q) => ({
          label: q.label,
          description: q.description,
          type: q.type,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          options: (q.options ?? []).join(","),
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        })),
      },
    },
    include: { questions: true },
  });
}
