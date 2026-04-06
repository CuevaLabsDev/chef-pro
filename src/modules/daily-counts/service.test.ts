import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    countSheetTemplate: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    countSheetSection: {
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    dailyCountSheet: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dailyCountEntry: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  getTemplate,
  upsertTemplate,
  getOrCreateSheet,
  updateEntries,
  submitSheet,
  amendSheet,
  computeSectionTotals,
  computeSheetSummary,
} from "./service";

const mock = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  countSheetTemplate: {
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  countSheetSection: {
    updateMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  dailyCountSheet: {
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  dailyCountEntry: {
    upsert: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.$transaction.mockImplementation(async (callbackOrArray: unknown) => {
    if (typeof callbackOrArray === "function") {
      return callbackOrArray(mock);
    }
    return Promise.all(callbackOrArray as Promise<unknown>[]);
  });
});

describe("getTemplate", () => {
  it("returns template when found", async () => {
    const fakeTemplate = {
      id: "t1",
      locationId: "l1",
      tastingPeriodId: "p1",
      sections: [],
      location: { id: "l1", name: "Cafe" },
      tastingPeriod: { id: "p1", name: "Lunch" },
    };
    mock.countSheetTemplate.findUnique.mockResolvedValue(fakeTemplate);

    const result = await getTemplate("l1", "p1");
    expect(result).toEqual(fakeTemplate);
    expect(mock.countSheetTemplate.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locationId_tastingPeriodId: { locationId: "l1", tastingPeriodId: "p1" } },
      })
    );
  });

  it("returns null when not found", async () => {
    mock.countSheetTemplate.findUnique.mockResolvedValue(null);

    const result = await getTemplate("l1", "p1");
    expect(result).toBeNull();
  });
});

describe("upsertTemplate", () => {
  it("creates a new template when none exists", async () => {
    mock.countSheetTemplate.findUnique.mockResolvedValue(null);

    const fakeCreated = {
      id: "t1",
      locationId: "l1",
      tastingPeriodId: "p1",
      sections: [{ id: "s1", label: "Line 1", sortOrder: 0 }],
    };
    mock.countSheetTemplate.create.mockResolvedValue(fakeCreated);

    const result = await upsertTemplate({
      locationId: "l1",
      tastingPeriodId: "p1",
      sections: [
        {
          label: "Line 1",
          fields: [{ key: "plates", label: "Plates", type: "number", role: "initial" }],
          sortOrder: 0,
        },
      ],
    });

    expect(result).toEqual(fakeCreated);
    expect(mock.countSheetTemplate.create).toHaveBeenCalled();
  });

  it("updates existing template sections", async () => {
    mock.countSheetTemplate.findUnique.mockResolvedValue({
      id: "t1",
      sections: [{ id: "s1", sortOrder: 0 }],
    });
    mock.countSheetSection.updateMany.mockResolvedValue({ count: 1 });
    mock.countSheetSection.upsert.mockResolvedValue({ id: "s1" });

    const updatedTemplate = {
      id: "t1",
      sections: [{ id: "s1", label: "Updated Line", sortOrder: 0 }],
    };
    mock.countSheetTemplate.findUniqueOrThrow.mockResolvedValue(updatedTemplate);

    const result = await upsertTemplate({
      locationId: "l1",
      tastingPeriodId: "p1",
      sections: [
        {
          label: "Updated Line",
          fields: [{ key: "plates", label: "Plates", type: "number", role: "initial" }],
          sortOrder: 0,
        },
      ],
    });

    expect(result).toEqual(updatedTemplate);
  });
});

describe("getOrCreateSheet", () => {
  it("returns existing sheet when found", async () => {
    const fakeSheet = { id: "sh1", templateId: "t1", date: new Date("2026-03-26") };
    mock.dailyCountSheet.findUnique.mockResolvedValue(fakeSheet);

    const result = await getOrCreateSheet("t1", new Date("2026-03-26"));
    expect(result).toEqual(fakeSheet);
    expect(mock.dailyCountSheet.create).not.toHaveBeenCalled();
  });

  it("creates new sheet with entries when not found", async () => {
    mock.dailyCountSheet.findUnique.mockResolvedValue(null);
    mock.countSheetTemplate.findUniqueOrThrow.mockResolvedValue({
      id: "t1",
      sections: [{ id: "s1" }, { id: "s2" }],
    });

    const fakeSheet = { id: "sh1", templateId: "t1", entries: [{}, {}] };
    mock.dailyCountSheet.create.mockResolvedValue(fakeSheet);

    const result = await getOrCreateSheet("t1", new Date("2026-03-26"));
    expect(result).toEqual(fakeSheet);
    expect(mock.dailyCountSheet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: "t1",
          entries: {
            create: [
              { sectionId: "s1", values: {} },
              { sectionId: "s2", values: {} },
            ],
          },
        }),
      })
    );
  });
});

describe("updateEntries", () => {
  it("updates entries on a draft sheet", async () => {
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ status: "draft" });
    mock.dailyCountEntry.upsert.mockResolvedValue({});
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ id: "sh1", entries: [] });

    const result = await updateEntries("sh1", [{ sectionId: "s1", values: { plates: 150 } }]);

    expect(result).toBeDefined();
  });

  it("rejects updates on a submitted sheet", async () => {
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ status: "submitted" });

    await expect(
      updateEntries("sh1", [{ sectionId: "s1", values: { plates: 150 } }])
    ).rejects.toThrow("Cannot update entries on a submitted sheet");
  });
});

describe("submitSheet", () => {
  it("submits a draft sheet", async () => {
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ status: "draft" });
    const fakeSubmitted = { id: "sh1", status: "submitted", submittedById: "u1" };
    mock.dailyCountSheet.update.mockResolvedValue(fakeSubmitted);

    const result = await submitSheet("sh1", "u1");
    expect(result.status).toBe("submitted");
    expect(mock.dailyCountSheet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "submitted", submittedById: "u1" }),
      })
    );
  });

  it("rejects submitting an already-submitted sheet", async () => {
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ status: "submitted" });

    await expect(submitSheet("sh1", "u1")).rejects.toThrow("already submitted");
  });
});

describe("amendSheet", () => {
  it("amends a submitted sheet with reason", async () => {
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ status: "submitted" });
    mock.dailyCountEntry.upsert.mockResolvedValue({});
    const fakeAmended = { id: "sh1", amendedById: "u1", amendReason: "Correction" };
    mock.dailyCountSheet.update.mockResolvedValue(fakeAmended);

    const result = await amendSheet("sh1", "u1", "Correction", [
      { sectionId: "s1", values: { plates: 200 } },
    ]);

    expect(result.amendReason).toBe("Correction");
  });

  it("rejects amending a draft sheet", async () => {
    mock.dailyCountSheet.findUniqueOrThrow.mockResolvedValue({ status: "draft" });

    await expect(amendSheet("sh1", "u1", "Fix", [{ sectionId: "s1", values: {} }])).rejects.toThrow(
      "Only submitted sheets can be amended"
    );
  });
});

describe("computeSectionTotals", () => {
  it("computes totals from field roles", () => {
    const section = {
      id: "s1",
      label: "Line 1",
      group: "Hotline",
      fields: [
        { key: "plates", label: "Plates", type: "number", role: "initial" },
        { key: "add", label: "Add", type: "number", role: "addition" },
        { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
      ],
    };
    const values = { plates: 150, add: 20, leftover: 10 };

    const totals = computeSectionTotals(section, values);

    expect(totals.total).toBe(170);
    expect(totals.totalUsed).toBe(160);
    expect(totals.group).toBe("Hotline");
  });

  it("handles missing values as zero", () => {
    const section = {
      id: "s1",
      label: "Line 1",
      group: null,
      fields: [
        { key: "plates", label: "Plates", type: "number", role: "initial" },
        { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
      ],
    };

    const totals = computeSectionTotals(section, {});

    expect(totals.total).toBe(0);
    expect(totals.totalUsed).toBe(0);
  });

  it("ignores fields without computation roles", () => {
    const section = {
      id: "s1",
      label: "Pastry",
      group: null,
      fields: [
        { key: "name", label: "Item Name", type: "text", role: "label" },
        { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
        { key: "time_ran_out", label: "Time Ran Out", type: "time" },
      ],
    };
    const values = { name: "Mochi", leftover: 11, time_ran_out: "10:30" };

    const totals = computeSectionTotals(section, values);

    expect(totals.total).toBe(0);
    expect(totals.totalUsed).toBe(-11);
  });
});

describe("computeSheetSummary", () => {
  it("computes group totals and grand total", () => {
    const sheet = {
      template: {
        sections: [
          {
            id: "s1",
            label: "Line 1",
            group: "Hotline",
            isActive: true,
            fields: [
              { key: "plates", label: "Plates", type: "number", role: "initial" },
              { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
            ],
          },
          {
            id: "s2",
            label: "Line 2",
            group: "Hotline",
            isActive: true,
            fields: [
              { key: "plates", label: "Plates", type: "number", role: "initial" },
              { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
            ],
          },
          {
            id: "s3",
            label: "Deli",
            group: "Other",
            isActive: true,
            fields: [
              { key: "plates", label: "Plates", type: "number", role: "initial" },
              { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
            ],
          },
        ],
      },
      entries: [
        { sectionId: "s1", values: { plates: 100, leftover: 10 } },
        { sectionId: "s2", values: { plates: 200, leftover: 20 } },
        { sectionId: "s3", values: { plates: 50, leftover: 5 } },
      ],
    } as never;

    const summary = computeSheetSummary(sheet);

    expect(summary.sectionTotals).toHaveLength(3);
    expect(summary.groupTotals).toHaveLength(2);

    const hotline = summary.groupTotals.find((g) => g.group === "Hotline");
    expect(hotline?.total).toBe(270);

    const other = summary.groupTotals.find((g) => g.group === "Other");
    expect(other?.total).toBe(45);

    expect(summary.grandTotal).toBe(315);
  });
});
