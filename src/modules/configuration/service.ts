import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { Building, Location } from "@prisma/client";
import type {
  CreateLocationInput,
  CreateTastingPeriodInput,
  CreateDeadlineRuleInput,
  CreateRatingSchemaInput,
} from "./types";

type ActiveFilterOptions = {
  includeInactive?: boolean;
};

export type ReactivationResult<T> =
  | { status: "reactivated"; record: T }
  | { status: "not_found" }
  | { status: "parent_inactive"; parentType: "Campus" | "Building"; parentId: string };

type PermanentDeleteBlockedCode =
  | "DELETE_REQUIRES_INACTIVE"
  | "DELETE_HAS_ACTIVE_DESCENDANTS"
  | "DELETE_BLOCKED_BY_HISTORY";

export type PermanentDeleteResult<T> =
  | { status: "deleted"; record: T }
  | { status: "not_found" }
  | {
      status: "blocked";
      code: PermanentDeleteBlockedCode;
      message: string;
      details?: Record<string, unknown>;
    };

type LocationHistorySnapshot = {
  id: string;
  name: string;
  isActive: boolean;
  _count: {
    tastingSessions: number;
    signagePackets: number;
  };
};

function summarizeLocationHistory(locations: LocationHistorySnapshot[]) {
  return locations.reduce(
    (acc, location) => {
      if (location._count.tastingSessions > 0 || location._count.signagePackets > 0) {
        acc.locationsWithHistory += 1;
      }
      acc.tastingSessions += location._count.tastingSessions;
      acc.signagePackets += location._count.signagePackets;
      return acc;
    },
    { locationsWithHistory: 0, tastingSessions: 0, signagePackets: 0 }
  );
}

// ─── Campuses ───────────────────────────────────────────────────────

export async function getCampuses(options?: ActiveFilterOptions) {
  const includeInactive = options?.includeInactive ?? false;

  return prisma.campus.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: {
      buildings: {
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { name: "asc" },
        include: {
          locations: {
            where: includeInactive ? undefined : { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });
}

export async function getCampusById(id: string) {
  return prisma.campus.findUnique({
    where: { id },
    include: {
      buildings: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: { locations: { where: { isActive: true }, orderBy: { name: "asc" } } },
      },
    },
  });
}

export async function findCampusByName(name: string) {
  return prisma.campus.findUnique({ where: { name } });
}

export async function createCampus(name: string) {
  return prisma.campus.create({ data: { name } });
}

export async function updateCampus(id: string, data: { name?: string; isActive?: boolean }) {
  return prisma.campus.update({ where: { id }, data });
}

export async function deactivateCampusCascade(id: string) {
  return prisma.$transaction(async (tx) => {
    const campus = await tx.campus.update({
      where: { id },
      data: { isActive: false },
    });

    await tx.building.updateMany({
      where: { campusId: id, isActive: true },
      data: { isActive: false },
    });

    await tx.location.updateMany({
      where: { isActive: true, building: { campusId: id } },
      data: { isActive: false },
    });

    return campus;
  });
}

export async function reactivateCampus(id: string) {
  return prisma.campus.update({ where: { id }, data: { isActive: true } });
}

export async function permanentlyDeleteCampus(
  id: string
): Promise<PermanentDeleteResult<Awaited<ReturnType<typeof reactivateCampus>>>> {
  const campus = await prisma.campus.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isActive: true,
      buildings: {
        select: {
          id: true,
          name: true,
          isActive: true,
          locations: {
            select: {
              id: true,
              name: true,
              isActive: true,
              _count: { select: { tastingSessions: true, signagePackets: true } },
            },
          },
        },
      },
    },
  });

  if (!campus) {
    return { status: "not_found" };
  }

  if (campus.isActive) {
    return {
      status: "blocked",
      code: "DELETE_REQUIRES_INACTIVE",
      message: "Deactivate this campus first, then delete it permanently.",
    };
  }

  const activeBuildings = campus.buildings.filter((building) => building.isActive);
  const allLocations = campus.buildings.flatMap((building) => building.locations);
  const activeLocations = allLocations.filter((location) => location.isActive);

  if (activeBuildings.length > 0 || activeLocations.length > 0) {
    return {
      status: "blocked",
      code: "DELETE_HAS_ACTIVE_DESCENDANTS",
      message:
        "Some buildings or cafes are still active. Deactivate them first, then delete this campus permanently.",
      details: {
        activeBuildings: activeBuildings.length,
        activeCafes: activeLocations.length,
      },
    };
  }

  const historySummary = summarizeLocationHistory(allLocations);
  if (historySummary.locationsWithHistory > 0) {
    return {
      status: "blocked",
      code: "DELETE_BLOCKED_BY_HISTORY",
      message:
        "Some cafes in this campus have tasting or menu history. This campus cannot be deleted permanently. Keep it inactive to preserve records.",
      details: historySummary,
    };
  }

  const buildingIds = campus.buildings.map((building) => building.id);

  const record = await prisma.$transaction(async (tx) => {
    if (buildingIds.length > 0) {
      await tx.location.deleteMany({
        where: {
          buildingId: { in: buildingIds },
        },
      });

      await tx.building.deleteMany({
        where: { campusId: id },
      });
    }

    return tx.campus.delete({ where: { id } });
  });

  return { status: "deleted", record };
}

// ─── Buildings ──────────────────────────────────────────────────────

export async function getBuildings(options?: ActiveFilterOptions) {
  const includeInactive = options?.includeInactive ?? false;

  return prisma.building.findMany({
    where: includeInactive
      ? undefined
      : {
          isActive: true,
          campus: { isActive: true },
        },
    orderBy: { name: "asc" },
    include: { campus: true },
  });
}

export async function getBuildingById(id: string) {
  return prisma.building.findUnique({ where: { id } });
}

export async function getBuildingWithCampusById(id: string) {
  return prisma.building.findUnique({
    where: { id },
    include: { campus: true },
  });
}

export async function findBuildingByCampusAndName(campusId: string, name: string) {
  return prisma.building.findUnique({
    where: {
      campusId_name: { campusId, name },
    },
  });
}

export async function createBuilding(input: { name: string; campusId: string }) {
  return prisma.building.create({ data: input });
}

export async function updateBuilding(id: string, data: { name?: string; isActive?: boolean }) {
  return prisma.building.update({ where: { id }, data });
}

export async function deactivateBuildingCascade(id: string) {
  return prisma.$transaction(async (tx) => {
    const building = await tx.building.update({
      where: { id },
      data: { isActive: false },
    });

    await tx.location.updateMany({
      where: { buildingId: id, isActive: true },
      data: { isActive: false },
    });

    return building;
  });
}

export async function reactivateBuilding(id: string): Promise<ReactivationResult<Building>> {
  return prisma.$transaction(async (tx) => {
    const building = await tx.building.findUnique({
      where: { id },
      select: {
        id: true,
        campusId: true,
        campus: { select: { isActive: true } },
      },
    });

    if (!building) {
      return { status: "not_found" };
    }

    if (!building.campus.isActive) {
      return {
        status: "parent_inactive",
        parentType: "Campus",
        parentId: building.campusId,
      };
    }

    const record = await tx.building.update({
      where: { id },
      data: { isActive: true },
    });

    return { status: "reactivated", record };
  });
}

export async function permanentlyDeleteBuilding(
  id: string
): Promise<PermanentDeleteResult<Building>> {
  const building = await prisma.building.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isActive: true,
      locations: {
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: { select: { tastingSessions: true, signagePackets: true } },
        },
      },
    },
  });

  if (!building) {
    return { status: "not_found" };
  }

  if (building.isActive) {
    return {
      status: "blocked",
      code: "DELETE_REQUIRES_INACTIVE",
      message: "Deactivate this building first, then delete it permanently.",
    };
  }

  const activeLocations = building.locations.filter((location) => location.isActive);
  if (activeLocations.length > 0) {
    return {
      status: "blocked",
      code: "DELETE_HAS_ACTIVE_DESCENDANTS",
      message:
        "Some cafes in this building are still active. Deactivate them first, then delete this building permanently.",
      details: {
        activeCafes: activeLocations.length,
      },
    };
  }

  const historySummary = summarizeLocationHistory(building.locations);
  if (historySummary.locationsWithHistory > 0) {
    return {
      status: "blocked",
      code: "DELETE_BLOCKED_BY_HISTORY",
      message:
        "This building has cafes with tasting or menu history. It cannot be deleted permanently. Keep it inactive to preserve records.",
      details: historySummary,
    };
  }

  const record = await prisma.$transaction(async (tx) => {
    await tx.location.deleteMany({
      where: { buildingId: id },
    });

    return tx.building.delete({
      where: { id },
    });
  });

  return { status: "deleted", record };
}

// ─── Locations ──────────────────────────────────────────────────────

export async function getLocations(options?: ActiveFilterOptions) {
  const includeInactive = options?.includeInactive ?? false;

  return prisma.location.findMany({
    where: includeInactive
      ? undefined
      : {
          isActive: true,
          OR: [{ buildingId: null }, { building: { isActive: true, campus: { isActive: true } } }],
        },
    orderBy: { name: "asc" },
  });
}

export async function getLocationsByIds(locationIds: string[], options?: ActiveFilterOptions) {
  const includeInactive = options?.includeInactive ?? false;
  if (locationIds.length === 0) return [];

  return prisma.location.findMany({
    where: {
      id: { in: locationIds },
      ...(includeInactive
        ? {}
        : {
            isActive: true,
            OR: [
              { buildingId: null },
              { building: { isActive: true, campus: { isActive: true } } },
            ],
          }),
    },
    orderBy: { name: "asc" },
    include: {
      building: { include: { campus: true } },
    },
  });
}

export async function getLocationById(id: string) {
  return prisma.location.findUnique({ where: { id } });
}

export async function getLocationDetail(id: string) {
  return prisma.location.findUnique({
    where: { id },
    include: {
      building: { include: { campus: true } },
      userAccess: {
        include: {
          user: {
            include: {
              roleSubtype: true,
            },
          },
        },
      },
      _count: { select: { tastingSessions: true, signagePackets: true } },
    },
  });
}

export async function getLocationsWithManagerCount() {
  return prisma.location.findMany({
    where: {
      isActive: true,
      OR: [{ buildingId: null }, { building: { isActive: true, campus: { isActive: true } } }],
    },
    orderBy: { name: "asc" },
    include: {
      building: { include: { campus: true } },
      _count: { select: { userAccess: true } },
    },
  });
}

export async function findLocationByName(name: string) {
  return prisma.location.findUnique({ where: { name } });
}

export async function createLocation(input: CreateLocationInput) {
  return prisma.location.create({
    data: { name: input.name, description: input.description, buildingId: input.buildingId },
  });
}

export async function updateLocation(
  id: string,
  data: Partial<CreateLocationInput & { isActive: boolean }>
) {
  return prisma.location.update({ where: { id }, data });
}

export async function reactivateLocation(id: string): Promise<ReactivationResult<Location>> {
  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      select: {
        id: true,
        buildingId: true,
        building: {
          select: {
            id: true,
            campusId: true,
            isActive: true,
            campus: { select: { isActive: true } },
          },
        },
      },
    });

    if (!location) {
      return { status: "not_found" };
    }

    if (location.building && !location.building.isActive) {
      return {
        status: "parent_inactive",
        parentType: "Building",
        parentId: location.building.id,
      };
    }

    if (location.building && !location.building.campus.isActive) {
      return {
        status: "parent_inactive",
        parentType: "Campus",
        parentId: location.building.campusId,
      };
    }

    const record = await tx.location.update({
      where: { id },
      data: { isActive: true },
    });

    return { status: "reactivated", record };
  });
}

export async function permanentlyDeleteLocation(
  id: string
): Promise<PermanentDeleteResult<Location>> {
  const location = await prisma.location.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { tastingSessions: true, signagePackets: true } },
    },
  });

  if (!location) {
    return { status: "not_found" };
  }

  if (location.isActive) {
    return {
      status: "blocked",
      code: "DELETE_REQUIRES_INACTIVE",
      message: "Deactivate this cafe first, then delete it permanently.",
    };
  }

  if (location._count.tastingSessions > 0 || location._count.signagePackets > 0) {
    return {
      status: "blocked",
      code: "DELETE_BLOCKED_BY_HISTORY",
      message:
        "This cafe has tasting or menu history. It cannot be deleted permanently. Keep it inactive to preserve records.",
      details: {
        tastingSessions: location._count.tastingSessions,
        signagePackets: location._count.signagePackets,
      },
    };
  }

  const record = await prisma.location.delete({ where: { id } });
  return { status: "deleted", record };
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
      daysOfWeek: input.daysOfWeek,
    },
  });
}

export async function updateDeadlineRule(
  id: string,
  data: Partial<CreateDeadlineRuleInput & { isActive: boolean }>
) {
  const updateData: Prisma.DeadlineRuleUpdateInput = {
    ...(data.deadlineTime !== undefined ? { deadlineTime: data.deadlineTime } : {}),
    ...(data.daysOfWeek !== undefined ? { daysOfWeek: data.daysOfWeek } : {}),
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
          options: q.options ?? [],
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        })),
      },
    },
    include: { questions: true },
  });
}
