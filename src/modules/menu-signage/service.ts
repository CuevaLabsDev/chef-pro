import { prisma } from "@/lib/db";
import type {
  CreateMenuSignagePacketInput,
  MenuSignageFilters,
  UpdateMenuSignagePacketExecutionInput,
  UpdateMenuSignagePacketStructureInput,
} from "./types";

function splitCsv(csv: string) {
  return csv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function joinCsv(values?: string[]) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .join(",");
}

function hydratePacket(packet: Awaited<ReturnType<typeof getMenuSignagePacketRaw>>) {
  if (!packet) return null;

  return {
    ...packet,
    items: packet.items.map((item) => ({
      ...item,
      dietTags: splitCsv(item.dietTags),
      allergenTags: splitCsv(item.allergenTags),
    })),
  };
}

function getMenuSignagePacketInclude() {
  return {
    location: true,
    createdBy: { select: { id: true, name: true, email: true } },
    assignedChef: { select: { id: true, name: true, email: true } },
    tastingSession: {
      select: {
        id: true,
        status: true,
        chef: { select: { id: true, name: true } },
      },
    },
    items: { orderBy: { sortOrder: "asc" as const } },
  };
}

async function getMenuSignagePacketRaw(id: string) {
  return prisma.menuSignagePacket.findUnique({
    where: { id },
    include: getMenuSignagePacketInclude(),
  });
}

export async function createMenuSignagePacket(
  createdById: string,
  input: CreateMenuSignagePacketInput
) {
  const packet = await prisma.menuSignagePacket.create({
    data: {
      date: new Date(input.date),
      locationId: input.locationId,
      meal: input.meal,
      market: input.market,
      cafe: input.cafe,
      status: input.status ?? "draft",
      assignedChefId: input.assignedChefId,
      checklistMenuPackage: input.checklistMenuPackage ?? false,
      checklistDigitalSignage: input.checklistDigitalSignage ?? false,
      checklistFoodCards: input.checklistFoodCards ?? false,
      checklistNotes: input.checklistNotes,
      backupReady: input.backupReady ?? false,
      backupUsed: input.backupUsed ?? false,
      backupNotes: input.backupNotes,
      tastingSessionId: input.tastingSessionId,
      createdById,
      items: {
        create: input.items.map((item) => ({
          category: item.category,
          itemName: item.itemName,
          ingredients: item.ingredients,
          theme: item.theme,
          dietTags: joinCsv(item.dietTags),
          allergenTags: joinCsv(item.allergenTags),
          sortOrder: item.sortOrder,
          isReadyForService: item.isReadyForService ?? false,
          wasUsed: item.wasUsed ?? false,
          notes: item.notes,
        })),
      },
    },
    include: getMenuSignagePacketInclude(),
  });

  return hydratePacket(packet);
}

export async function getMenuSignagePacket(id: string) {
  const packet = await getMenuSignagePacketRaw(id);
  return hydratePacket(packet);
}

export async function listMenuSignagePackets(
  filters: MenuSignageFilters,
  accessibleLocationIds?: string[]
) {
  const andWhere: Record<string, unknown>[] = [];

  if (filters.dateFrom) {
    andWhere.push({ date: { gte: new Date(filters.dateFrom) } });
  }
  if (filters.dateTo) {
    andWhere.push({ date: { lte: new Date(filters.dateTo) } });
  }
  if (filters.locationId) {
    andWhere.push({ locationId: filters.locationId });
  }
  if (filters.meal) {
    andWhere.push({ meal: filters.meal });
  }
  if (filters.status) {
    andWhere.push({ status: filters.status });
  }
  if (filters.assignedChefId) {
    andWhere.push({ assignedChefId: filters.assignedChefId });
  }
  if (accessibleLocationIds && accessibleLocationIds.length > 0) {
    andWhere.push({ locationId: { in: accessibleLocationIds } });
  }

  const packets = await prisma.menuSignagePacket.findMany({
    where: andWhere.length > 0 ? { AND: andWhere } : {},
    include: getMenuSignagePacketInclude(),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return packets
    .map((packet) => hydratePacket(packet))
    .filter((packet): packet is NonNullable<typeof packet> => packet !== null);
}

export async function updateMenuSignagePacketStructure(
  packetId: string,
  input: UpdateMenuSignagePacketStructureInput
) {
  if (input.items) {
    await prisma.menuSignageItem.deleteMany({ where: { packetId } });
  }

  const packet = await prisma.menuSignagePacket.update({
    where: { id: packetId },
    data: {
      date: input.date ? new Date(input.date) : undefined,
      locationId: input.locationId,
      meal: input.meal,
      market: input.market,
      cafe: input.cafe,
      status: input.status,
      assignedChefId: input.assignedChefId,
      tastingSessionId: input.tastingSessionId,
      ...(input.items
        ? {
            items: {
              create: input.items.map((item) => ({
                category: item.category,
                itemName: item.itemName,
                ingredients: item.ingredients,
                theme: item.theme,
                dietTags: joinCsv(item.dietTags),
                allergenTags: joinCsv(item.allergenTags),
                sortOrder: item.sortOrder,
                isReadyForService: item.isReadyForService ?? false,
                wasUsed: item.wasUsed ?? false,
                notes: item.notes,
              })),
            },
          }
        : {}),
    },
    include: getMenuSignagePacketInclude(),
  });

  return hydratePacket(packet);
}

export async function updateMenuSignagePacketExecution(
  packetId: string,
  input: UpdateMenuSignagePacketExecutionInput
) {
  await prisma.$transaction(async (tx) => {
    await tx.menuSignagePacket.update({
      where: { id: packetId },
      data: {
        status: input.status,
        checklistMenuPackage: input.checklistMenuPackage,
        checklistDigitalSignage: input.checklistDigitalSignage,
        checklistFoodCards: input.checklistFoodCards,
        checklistNotes: input.checklistNotes,
        backupReady: input.backupReady,
        backupUsed: input.backupUsed,
        backupNotes: input.backupNotes,
      },
    });

    if (input.itemExecution && input.itemExecution.length > 0) {
      await Promise.all(
        input.itemExecution.map((item) =>
          tx.menuSignageItem.updateMany({
            where: { id: item.id, packetId },
            data: {
              isReadyForService: item.isReadyForService,
              wasUsed: item.wasUsed,
              notes: item.notes,
            },
          })
        )
      );
    }
  });

  const packet = await getMenuSignagePacketRaw(packetId);
  return hydratePacket(packet);
}

export async function deleteMenuSignagePacket(packetId: string) {
  return prisma.menuSignagePacket.delete({
    where: { id: packetId },
  });
}
