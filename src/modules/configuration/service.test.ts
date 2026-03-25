import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    campus: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    building: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    tastingPeriod: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deadlineRule: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ratingSchema: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  getCampuses,
  createCampus,
  updateCampus,
  createBuilding,
  updateBuilding,
  getLocations,
  createLocation,
  updateLocation,
  deactivateCampusCascade,
  reactivateBuilding,
  reactivateLocation,
  permanentlyDeleteLocation,
  permanentlyDeleteBuilding,
  permanentlyDeleteCampus,
  getTastingPeriods,
  createTastingPeriod,
  createDeadlineRule,
} from "./service";

const mock = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  campus: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  building: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  location: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  tastingPeriod: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  deadlineRule: { create: ReturnType<typeof vi.fn> };
  ratingSchema: { updateMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.$transaction.mockImplementation(async (callback: (tx: typeof mock) => unknown) =>
    callback(mock)
  );
});

describe("Campuses", () => {
  it("getCampuses returns active campuses with buildings and locations", async () => {
    const fakeCampus = { id: "c1", name: "Main", buildings: [] };
    mock.campus.findMany.mockResolvedValue([fakeCampus]);

    const result = await getCampuses();
    expect(result).toEqual([fakeCampus]);
    expect(mock.campus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );
  });

  it("createCampus creates with provided name", async () => {
    mock.campus.create.mockResolvedValue({ id: "c1", name: "New Campus" });

    const result = await createCampus("New Campus");
    expect(result.name).toBe("New Campus");
    expect(mock.campus.create).toHaveBeenCalledWith({ data: { name: "New Campus" } });
  });

  it("updateCampus soft-deletes by setting isActive to false", async () => {
    mock.campus.update.mockResolvedValue({ id: "c1", isActive: false });

    const result = await updateCampus("c1", { isActive: false });
    expect(result.isActive).toBe(false);
    expect(mock.campus.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: false },
    });
  });
});

describe("Buildings", () => {
  it("createBuilding creates with name and campusId", async () => {
    mock.building.create.mockResolvedValue({ id: "b1", name: "B1", campusId: "c1" });

    const result = await createBuilding({ name: "B1", campusId: "c1" });
    expect(result.name).toBe("B1");
  });

  it("updateBuilding updates name", async () => {
    mock.building.update.mockResolvedValue({ id: "b1", name: "Updated" });

    const result = await updateBuilding("b1", { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("reactivateBuilding blocks when parent campus is inactive", async () => {
    mock.building.findUnique.mockResolvedValue({
      id: "b1",
      campusId: "c1",
      campus: { isActive: false },
    });

    const result = await reactivateBuilding("b1");

    expect(result).toEqual({
      status: "parent_inactive",
      parentType: "Campus",
      parentId: "c1",
    });
    expect(mock.building.update).not.toHaveBeenCalled();
  });
});

describe("Locations", () => {
  it("getLocations returns only active locations", async () => {
    mock.location.findMany.mockResolvedValue([{ id: "l1", name: "Cafe", isActive: true }]);

    const result = await getLocations();
    expect(result).toHaveLength(1);
    expect(mock.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("createLocation passes name, description, and buildingId", async () => {
    mock.location.create.mockResolvedValue({ id: "l1", name: "New Cafe" });

    await createLocation({ name: "New Cafe", description: "Desc", buildingId: "b1" });
    expect(mock.location.create).toHaveBeenCalledWith({
      data: { name: "New Cafe", description: "Desc", buildingId: "b1" },
    });
  });

  it("updateLocation calls prisma update with partial data", async () => {
    mock.location.update.mockResolvedValue({ id: "l1", isActive: false });

    await updateLocation("l1", { isActive: false });
    expect(mock.location.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { isActive: false },
    });
  });

  it("reactivateLocation blocks when parent building is inactive", async () => {
    mock.location.findUnique.mockResolvedValue({
      id: "l1",
      buildingId: "b1",
      building: {
        id: "b1",
        campusId: "c1",
        isActive: false,
        campus: { isActive: true },
      },
    });

    const result = await reactivateLocation("l1");

    expect(result).toEqual({
      status: "parent_inactive",
      parentType: "Building",
      parentId: "b1",
    });
    expect(mock.location.update).not.toHaveBeenCalled();
  });
});

describe("Lifecycle Cascades", () => {
  it("deactivateCampusCascade deactivates campus, buildings, and locations in a transaction", async () => {
    mock.campus.update.mockResolvedValue({ id: "c1", isActive: false });
    mock.building.updateMany.mockResolvedValue({ count: 3 });
    mock.location.updateMany.mockResolvedValue({ count: 7 });

    const result = await deactivateCampusCascade("c1");

    expect(result).toEqual({ id: "c1", isActive: false });
    expect(mock.$transaction).toHaveBeenCalledOnce();
    expect(mock.campus.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: false },
    });
    expect(mock.building.updateMany).toHaveBeenCalledWith({
      where: { campusId: "c1", isActive: true },
      data: { isActive: false },
    });
    expect(mock.location.updateMany).toHaveBeenCalledWith({
      where: { isActive: true, building: { campusId: "c1" } },
      data: { isActive: false },
    });
  });
});

describe("Permanent Delete Safety", () => {
  it("blocks permanent location delete when location is still active", async () => {
    mock.location.findUnique.mockResolvedValue({
      id: "l1",
      name: "Cafe One",
      isActive: true,
      _count: { tastingSessions: 0, signagePackets: 0 },
    });

    const result = await permanentlyDeleteLocation("l1");

    expect(result).toEqual({
      status: "blocked",
      code: "DELETE_REQUIRES_INACTIVE",
      message: "Deactivate this cafe first, then delete it permanently.",
    });
    expect(mock.location.delete).not.toHaveBeenCalled();
  });

  it("blocks permanent location delete when history exists", async () => {
    mock.location.findUnique.mockResolvedValue({
      id: "l1",
      name: "Cafe One",
      isActive: false,
      _count: { tastingSessions: 2, signagePackets: 1 },
    });

    const result = await permanentlyDeleteLocation("l1");

    expect(result).toEqual({
      status: "blocked",
      code: "DELETE_BLOCKED_BY_HISTORY",
      message:
        "This cafe has tasting or menu history. It cannot be deleted permanently. Keep it inactive to preserve records.",
      details: {
        tastingSessions: 2,
        signagePackets: 1,
      },
    });
    expect(mock.location.delete).not.toHaveBeenCalled();
  });

  it("deletes an inactive location with no history", async () => {
    mock.location.findUnique.mockResolvedValue({
      id: "l1",
      name: "Cafe One",
      isActive: false,
      _count: { tastingSessions: 0, signagePackets: 0 },
    });
    mock.location.delete.mockResolvedValue({ id: "l1", name: "Cafe One", isActive: false });

    const result = await permanentlyDeleteLocation("l1");

    expect(result).toEqual({
      status: "deleted",
      record: { id: "l1", name: "Cafe One", isActive: false },
    });
    expect(mock.location.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
  });

  it("blocks permanent building delete when active cafes still exist", async () => {
    mock.building.findUnique.mockResolvedValue({
      id: "b1",
      name: "Building A",
      isActive: false,
      locations: [
        {
          id: "l1",
          name: "Cafe One",
          isActive: true,
          _count: { tastingSessions: 0, signagePackets: 0 },
        },
      ],
    });

    const result = await permanentlyDeleteBuilding("b1");

    expect(result).toEqual({
      status: "blocked",
      code: "DELETE_HAS_ACTIVE_DESCENDANTS",
      message:
        "Some cafes in this building are still active. Deactivate them first, then delete this building permanently.",
      details: { activeCafes: 1 },
    });
    expect(mock.location.deleteMany).not.toHaveBeenCalled();
    expect(mock.building.delete).not.toHaveBeenCalled();
  });

  it("blocks permanent campus delete when descendant history exists", async () => {
    mock.campus.findUnique.mockResolvedValue({
      id: "c1",
      name: "Main Campus",
      isActive: false,
      buildings: [
        {
          id: "b1",
          name: "Building A",
          isActive: false,
          locations: [
            {
              id: "l1",
              name: "Cafe One",
              isActive: false,
              _count: { tastingSessions: 1, signagePackets: 0 },
            },
          ],
        },
      ],
    });

    const result = await permanentlyDeleteCampus("c1");

    expect(result).toEqual({
      status: "blocked",
      code: "DELETE_BLOCKED_BY_HISTORY",
      message:
        "Some cafes in this campus have tasting or menu history. This campus cannot be deleted permanently. Keep it inactive to preserve records.",
      details: {
        locationsWithHistory: 1,
        tastingSessions: 1,
        signagePackets: 0,
      },
    });
    expect(mock.location.deleteMany).not.toHaveBeenCalled();
    expect(mock.building.deleteMany).not.toHaveBeenCalled();
    expect(mock.campus.delete).not.toHaveBeenCalled();
  });

  it("deletes an inactive building and its inactive cafes when there is no history", async () => {
    mock.building.findUnique.mockResolvedValue({
      id: "b1",
      name: "Building A",
      isActive: false,
      locations: [
        {
          id: "l1",
          name: "Cafe One",
          isActive: false,
          _count: { tastingSessions: 0, signagePackets: 0 },
        },
      ],
    });
    mock.location.deleteMany.mockResolvedValue({ count: 1 });
    mock.building.delete.mockResolvedValue({ id: "b1", name: "Building A", isActive: false });

    const result = await permanentlyDeleteBuilding("b1");

    expect(result).toEqual({
      status: "deleted",
      record: { id: "b1", name: "Building A", isActive: false },
    });
    expect(mock.$transaction).toHaveBeenCalled();
    expect(mock.location.deleteMany).toHaveBeenCalledWith({ where: { buildingId: "b1" } });
    expect(mock.building.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
  });
});

describe("Tasting Periods", () => {
  it("getTastingPeriods returns active periods ordered by sortOrder", async () => {
    mock.tastingPeriod.findMany.mockResolvedValue([{ id: "p1", name: "Lunch", sortOrder: 1 }]);

    const result = await getTastingPeriods();
    expect(result).toHaveLength(1);
  });

  it("createTastingPeriod creates with name and sortOrder", async () => {
    mock.tastingPeriod.create.mockResolvedValue({ id: "p1", name: "Dinner", sortOrder: 2 });

    const result = await createTastingPeriod({ name: "Dinner", sortOrder: 2 });
    expect(result.name).toBe("Dinner");
  });
});

describe("Deadline Rules", () => {
  it("createDeadlineRule passes native int array for daysOfWeek", async () => {
    mock.deadlineRule.create.mockResolvedValue({ id: "d1" });

    await createDeadlineRule({
      locationId: "l1",
      tastingPeriodId: "p1",
      deadlineTime: "09:30",
      daysOfWeek: [1, 2, 3, 4, 5],
    });

    expect(mock.deadlineRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        daysOfWeek: [1, 2, 3, 4, 5],
      }),
    });
  });
});
