import { prisma } from "@/lib/db";
import { eventBus } from "@/modules/events/bus";
import type {
  AddPacketSignatureInput,
  CreateMenuSignagePacketInput,
  CreatePacketAmendmentInput,
  FinalizePacketForServiceInput,
  MenuSignageFilters,
  ResolvePacketAmendmentInput,
  UpdateMenuSignagePacketExecutionInput,
  UpdateMenuSignagePacketStructureInput,
} from "./types";

function hydratePacket(packet: Awaited<ReturnType<typeof getMenuSignagePacketRaw>>) {
  if (!packet) return null;
  return packet;
}

function getMenuSignagePacketInclude() {
  return {
    location: true,
    createdBy: { select: { id: true, name: true, email: true } },
    assignedChef: { select: { id: true, name: true, email: true } },
    publishedBy: { select: { id: true, name: true, email: true } },
    readyForFinalReviewBy: { select: { id: true, name: true, email: true } },
    finalizedForServiceBy: { select: { id: true, name: true, email: true } },
    tastingSession: {
      select: {
        id: true,
        status: true,
        chef: { select: { id: true, name: true } },
      },
    },
    items: { orderBy: { sortOrder: "asc" as const } },
    reviewSignatures: {
      orderBy: { createdAt: "asc" as const },
      include: {
        signer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    },
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
      theme: input.theme,
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
          theme: input.theme,
          dietTags: item.dietTags ?? [],
          allergenTags: item.allergenTags ?? [],
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

export async function getPacketOverviewByLocations(
  locationIds: string[],
  options?: { dateFrom?: string; dateTo?: string }
) {
  if (locationIds.length === 0) {
    return {
      totalsByStatus: {} as Record<string, number>,
      totalsByLocation: {} as Record<string, { total: number; byStatus: Record<string, number> }>,
    };
  }

  const where: Record<string, unknown> = {
    locationId: { in: locationIds },
  };

  if (options?.dateFrom || options?.dateTo) {
    where.date = {
      ...(options.dateFrom ? { gte: new Date(options.dateFrom) } : {}),
      ...(options.dateTo ? { lte: new Date(options.dateTo) } : {}),
    };
  }

  const packets = await prisma.menuSignagePacket.findMany({
    where,
    select: { locationId: true, status: true },
  });

  const totalsByStatus: Record<string, number> = {};
  const totalsByLocation: Record<string, { total: number; byStatus: Record<string, number> }> = {};

  for (const packet of packets) {
    totalsByStatus[packet.status] = (totalsByStatus[packet.status] ?? 0) + 1;

    if (!totalsByLocation[packet.locationId]) {
      totalsByLocation[packet.locationId] = { total: 0, byStatus: {} };
    }
    totalsByLocation[packet.locationId].total += 1;
    totalsByLocation[packet.locationId].byStatus[packet.status] =
      (totalsByLocation[packet.locationId].byStatus[packet.status] ?? 0) + 1;
  }

  return { totalsByStatus, totalsByLocation };
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
      theme: input.theme,
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
                theme: input.theme,
                dietTags: item.dietTags ?? [],
                allergenTags: item.allergenTags ?? [],
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

type PacketActor = {
  id: string;
  name: string;
  role: string;
};

const FINAL_REVIEW_SIGNATURE_MIN = 2;

export async function addPacketReviewSignature(
  packetId: string,
  actor: PacketActor,
  input: AddPacketSignatureInput
) {
  const typedName = input.typedName.trim();
  if (!input.acknowledged) {
    throw new Error("Please confirm the signature statement before submitting.");
  }
  if (!typedName) {
    throw new Error("Signature name is required.");
  }

  await prisma.$transaction(async (tx) => {
    const packet = await tx.menuSignagePacket.findUnique({
      where: { id: packetId },
      select: { id: true, status: true },
    });
    if (!packet) {
      throw new Error("Packet not found.");
    }
    if (packet.status === "finalized_for_service") {
      throw new Error("This packet is already finalized for service.");
    }

    const existing = await tx.packetReviewSignature.findUnique({
      where: {
        packetId_signerId: {
          packetId,
          signerId: actor.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new Error("You already signed this packet.");
    }

    await tx.packetReviewSignature.create({
      data: {
        packetId,
        signerId: actor.id,
        signerNameInput: typedName,
        signerRole: actor.role,
      },
    });
  });

  const packet = await getMenuSignagePacketRaw(packetId);
  return hydratePacket(packet);
}

export async function publishMenuSignagePacket(packetId: string, actorId: string) {
  const packet = await getMenuSignagePacketRaw(packetId);
  if (!packet) {
    throw new Error("Packet not found.");
  }
  if (packet.status !== "draft") {
    throw new Error("Only draft packets can be published.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const published = await tx.menuSignagePacket.update({
      where: { id: packetId },
      data: {
        status: "published",
        publishedById: actorId,
        publishedAt: new Date(),
      },
    });

    const period = await tx.tastingPeriod.findFirst({
      where: { name: packet.meal, isActive: true },
    });

    if (period) {
      const existingSession = await tx.tastingSession.findFirst({
        where: {
          date: packet.date,
          locationId: packet.locationId,
          tastingPeriodId: period.id,
        },
      });

      if (!existingSession) {
        const session = await tx.tastingSession.create({
          data: {
            date: packet.date,
            locationId: packet.locationId,
            tastingPeriodId: period.id,
            status: "draft",
            items: {
              create: packet.items.map((item) => ({
                dishName: item.itemName,
                sortOrder: item.sortOrder,
                temperatureCompliance: "not_checked",
              })),
            },
          },
        });

        await tx.menuSignagePacket.update({
          where: { id: packetId },
          data: { tastingSessionId: session.id },
        });
      }
    }

    return tx.menuSignagePacket.findUnique({
      where: { id: packetId },
      include: getMenuSignagePacketInclude(),
    });
  });

  return hydratePacket(updated);
}

export async function submitPacketForFinalReview(packetId: string, actorId: string) {
  const packet = await getMenuSignagePacketRaw(packetId);
  if (!packet) {
    throw new Error("Packet not found.");
  }
  if (!["published", "for_final_review"].includes(packet.status)) {
    throw new Error("Packet must be published before final review.");
  }

  const updated = await prisma.menuSignagePacket.update({
    where: { id: packetId },
    data: {
      status: "for_final_review",
      readyForFinalReviewById: actorId,
      readyForFinalReviewAt: new Date(),
    },
    include: getMenuSignagePacketInclude(),
  });

  return hydratePacket(updated);
}

export async function finalizePacketForService(
  packetId: string,
  actor: PacketActor,
  input: FinalizePacketForServiceInput
) {
  const typedName = input.typedName.trim();
  if (!input.acknowledged) {
    throw new Error("Please confirm the signature statement before finalizing.");
  }
  if (!typedName) {
    throw new Error("Signature name is required.");
  }

  await prisma.$transaction(async (tx) => {
    const packet = await tx.menuSignagePacket.findUnique({
      where: { id: packetId },
      select: { id: true, status: true },
    });
    if (!packet) {
      throw new Error("Packet not found.");
    }
    if (packet.status !== "for_final_review") {
      throw new Error("Packet must be in final review before finalizing.");
    }

    const existingSignature = await tx.packetReviewSignature.findUnique({
      where: {
        packetId_signerId: {
          packetId,
          signerId: actor.id,
        },
      },
      select: { id: true },
    });
    if (!existingSignature) {
      await tx.packetReviewSignature.create({
        data: {
          packetId,
          signerId: actor.id,
          signerNameInput: typedName,
          signerRole: actor.role,
        },
      });
    }

    const signatureCount = await tx.packetReviewSignature.count({
      where: { packetId },
    });
    if (signatureCount < FINAL_REVIEW_SIGNATURE_MIN) {
      throw new Error("Two signatures are required before finalizing for service.");
    }

    await tx.menuSignagePacket.update({
      where: { id: packetId },
      data: {
        status: "finalized_for_service",
        finalizedForServiceById: actor.id,
        finalizedForServiceAt: new Date(),
      },
    });
  });

  const packet = await getMenuSignagePacketRaw(packetId);
  return hydratePacket(packet);
}

export async function deleteMenuSignagePacket(packetId: string) {
  return prisma.menuSignagePacket.delete({
    where: { id: packetId },
  });
}

// ─── Packet Amendments ─────────────────────────────────────────────

const amendmentInclude = {
  requestedBy: { select: { id: true, name: true, email: true, role: true } },
  resolvedBy: { select: { id: true, name: true, email: true, role: true } },
  item: { select: { id: true, itemName: true, category: true } },
  packet: {
    select: {
      id: true,
      locationId: true,
      date: true,
      meal: true,
      location: { select: { name: true } },
    },
  },
} as const;

export async function createPacketAmendment(
  packetId: string,
  actorId: string,
  input: CreatePacketAmendmentInput
) {
  const packet = await prisma.menuSignagePacket.findUnique({
    where: { id: packetId },
    select: {
      id: true,
      locationId: true,
      date: true,
      meal: true,
      location: { select: { name: true } },
    },
  });
  if (!packet) throw new Error("Packet not found.");

  const amendment = await prisma.packetAmendment.create({
    data: {
      packetId,
      type: input.type,
      reason: input.reason,
      description: input.description,
      itemId: input.itemId,
      requestedById: actorId,
      status: "pending",
    },
    include: amendmentInclude,
  });

  const eventType =
    input.type === "backup_swap" && input.reason === "service_change"
      ? ("backup_sign_requested" as const)
      : ("packet_amendment_requested" as const);

  eventBus
    .publish(eventType, actorId, amendment.id, "PacketAmendment", {
      packetId,
      locationId: packet.locationId,
      locationName: packet.location.name,
      meal: packet.meal,
      amendmentType: input.type,
      reason: input.reason,
      description: input.description,
    })
    .catch(() => {});

  return amendment;
}

export async function resolvePacketAmendment(
  amendmentId: string,
  actorId: string,
  input: ResolvePacketAmendmentInput
) {
  const amendment = await prisma.packetAmendment.findUnique({
    where: { id: amendmentId },
    select: { id: true, status: true, packetId: true },
  });
  if (!amendment) throw new Error("Amendment not found.");
  if (amendment.status !== "pending") throw new Error("Amendment is already resolved.");

  const updated = await prisma.packetAmendment.update({
    where: { id: amendmentId },
    data: {
      status: input.status,
      resolvedById: actorId,
      resolvedAt: new Date(),
    },
    include: amendmentInclude,
  });

  eventBus
    .publish("packet_amendment_resolved", actorId, amendmentId, "PacketAmendment", {
      packetId: amendment.packetId,
      resolution: input.status,
    })
    .catch(() => {});

  return updated;
}

export async function getPacketAmendments(packetId: string) {
  return prisma.packetAmendment.findMany({
    where: { packetId },
    include: amendmentInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPacketItemsForTasting(packetId: string) {
  const items = await prisma.menuSignageItem.findMany({
    where: { packetId },
    select: { itemName: true, category: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  return items.map((item) => ({
    dishName: item.itemName,
    category: item.category,
    sortOrder: item.sortOrder,
  }));
}

export async function getPendingAmendmentsByLocations(locationIds: string[], dateFrom?: string) {
  const where: Record<string, unknown> = {
    packet: { locationId: { in: locationIds } },
  };
  if (dateFrom) {
    where.createdAt = { gte: new Date(dateFrom) };
  }
  return prisma.packetAmendment.findMany({
    where,
    include: amendmentInclude,
    orderBy: { createdAt: "desc" },
  });
}
