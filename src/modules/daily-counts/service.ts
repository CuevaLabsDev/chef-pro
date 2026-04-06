import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  UpsertTemplateInput,
  EntryInput,
  FieldDefinition,
  SectionTotals,
  GroupTotals,
  SheetSummary,
  TemplateWithSections,
  SheetWithEntries,
} from "./types";

const templateInclude = Prisma.validator<Prisma.CountSheetTemplateInclude>()({
  sections: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
  location: { select: { id: true, name: true } },
  tastingPeriod: { select: { id: true, name: true } },
});

const sheetInclude = Prisma.validator<Prisma.DailyCountSheetInclude>()({
  entries: { include: { section: true } },
  template: { include: templateInclude },
  submittedBy: { select: { id: true, name: true } },
  amendedBy: { select: { id: true, name: true } },
});

// ─── Template CRUD ──────────────────────────────────────────────────

export async function getTemplate(
  locationId: string,
  tastingPeriodId: string
): Promise<TemplateWithSections | null> {
  return prisma.countSheetTemplate.findUnique({
    where: { locationId_tastingPeriodId: { locationId, tastingPeriodId } },
    include: templateInclude,
  });
}

export async function getTemplateById(id: string): Promise<TemplateWithSections | null> {
  return prisma.countSheetTemplate.findUnique({
    where: { id },
    include: templateInclude,
  });
}

export async function upsertTemplate(input: UpsertTemplateInput): Promise<TemplateWithSections> {
  const existing = await prisma.countSheetTemplate.findUnique({
    where: {
      locationId_tastingPeriodId: {
        locationId: input.locationId,
        tastingPeriodId: input.tastingPeriodId,
      },
    },
    include: { sections: true },
  });

  if (existing) {
    return prisma.$transaction(async (tx) => {
      await tx.countSheetSection.updateMany({
        where: { templateId: existing.id },
        data: { isActive: false },
      });

      for (const section of input.sections) {
        await tx.countSheetSection.upsert({
          where: {
            templateId_sortOrder: {
              templateId: existing.id,
              sortOrder: section.sortOrder,
            },
          },
          update: {
            label: section.label,
            group: section.group ?? null,
            fields: section.fields as unknown as Prisma.InputJsonValue,
            isActive: true,
          },
          create: {
            templateId: existing.id,
            label: section.label,
            group: section.group ?? null,
            fields: section.fields as unknown as Prisma.InputJsonValue,
            sortOrder: section.sortOrder,
          },
        });
      }

      return tx.countSheetTemplate.findUniqueOrThrow({
        where: { id: existing.id },
        include: templateInclude,
      });
    });
  }

  return prisma.countSheetTemplate.create({
    data: {
      locationId: input.locationId,
      tastingPeriodId: input.tastingPeriodId,
      sections: {
        create: input.sections.map((s) => ({
          label: s.label,
          group: s.group ?? null,
          fields: s.fields as unknown as Prisma.InputJsonValue,
          sortOrder: s.sortOrder,
        })),
      },
    },
    include: templateInclude,
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.countSheetTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}

// ─── Sheet Lifecycle ────────────────────────────────────────────────

export async function getOrCreateSheet(templateId: string, date: Date): Promise<SheetWithEntries> {
  const dateOnly = new Date(date.toISOString().split("T")[0]);

  const existing = await prisma.dailyCountSheet.findUnique({
    where: { templateId_date: { templateId, date: dateOnly } },
    include: sheetInclude,
  });

  if (existing) return existing;

  const template = await prisma.countSheetTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { sections: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });

  return prisma.dailyCountSheet.create({
    data: {
      templateId,
      date: dateOnly,
      entries: {
        create: template.sections.map((section) => ({
          sectionId: section.id,
          values: {},
        })),
      },
    },
    include: sheetInclude,
  });
}

export async function getSheetById(id: string): Promise<SheetWithEntries | null> {
  return prisma.dailyCountSheet.findUnique({
    where: { id },
    include: sheetInclude,
  });
}

export async function updateEntries(
  sheetId: string,
  entries: EntryInput[]
): Promise<SheetWithEntries> {
  const sheet = await prisma.dailyCountSheet.findUniqueOrThrow({
    where: { id: sheetId },
    select: { status: true },
  });

  if (sheet.status === "submitted") {
    throw new Error("Cannot update entries on a submitted sheet. Use amend instead.");
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.dailyCountEntry.upsert({
        where: { sheetId_sectionId: { sheetId, sectionId: entry.sectionId } },
        update: { values: entry.values as unknown as Prisma.InputJsonValue },
        create: {
          sheetId,
          sectionId: entry.sectionId,
          values: entry.values as unknown as Prisma.InputJsonValue,
        },
      })
    )
  );

  return prisma.dailyCountSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: sheetInclude,
  });
}

export async function submitSheet(sheetId: string, userId: string): Promise<SheetWithEntries> {
  const sheet = await prisma.dailyCountSheet.findUniqueOrThrow({
    where: { id: sheetId },
    select: { status: true },
  });

  if (sheet.status === "submitted") {
    throw new Error("Sheet is already submitted.");
  }

  return prisma.dailyCountSheet.update({
    where: { id: sheetId },
    data: {
      status: "submitted",
      submittedById: userId,
      submittedAt: new Date(),
    },
    include: sheetInclude,
  });
}

export async function amendSheet(
  sheetId: string,
  userId: string,
  reason: string,
  entries: EntryInput[]
): Promise<SheetWithEntries> {
  const sheet = await prisma.dailyCountSheet.findUniqueOrThrow({
    where: { id: sheetId },
    select: { status: true },
  });

  if (sheet.status !== "submitted") {
    throw new Error("Only submitted sheets can be amended.");
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.dailyCountEntry.upsert({
        where: { sheetId_sectionId: { sheetId, sectionId: entry.sectionId } },
        update: { values: entry.values as unknown as Prisma.InputJsonValue },
        create: {
          sheetId,
          sectionId: entry.sectionId,
          values: entry.values as unknown as Prisma.InputJsonValue,
        },
      })
    )
  );

  return prisma.dailyCountSheet.update({
    where: { id: sheetId },
    data: {
      amendedById: userId,
      amendedAt: new Date(),
      amendReason: reason,
    },
    include: sheetInclude,
  });
}

// ─── Queries ────────────────────────────────────────────────────────

export async function listSheets(filters: {
  locationIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: Prisma.DailyCountSheetWhereInput = {};

  if (filters.locationIds) {
    where.template = { locationId: { in: filters.locationIds } };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = filters.dateFrom;
    if (filters.dateTo) where.date.lte = filters.dateTo;
  }

  return prisma.dailyCountSheet.findMany({
    where,
    include: {
      template: {
        include: {
          location: { select: { id: true, name: true } },
          tastingPeriod: { select: { id: true, name: true } },
        },
      },
      submittedBy: { select: { id: true, name: true } },
      entries: { include: { section: true } },
    },
    orderBy: { date: "desc" },
  });
}

// ─── Totals Computation ─────────────────────────────────────────────

function parseSectionFields(section: { fields: Prisma.JsonValue }): FieldDefinition[] {
  if (!Array.isArray(section.fields)) return [];
  return section.fields as unknown as FieldDefinition[];
}

export function computeSectionTotals(
  section: { id: string; label: string; group: string | null; fields: Prisma.JsonValue },
  values: Record<string, unknown>
): SectionTotals {
  const fields = parseSectionFields(section);
  let initialSum = 0;
  let additionSum = 0;
  let remainderSum = 0;

  for (const field of fields) {
    const raw = values[field.key];
    const num = typeof raw === "number" ? raw : 0;

    switch (field.role) {
      case "initial":
        initialSum += num;
        break;
      case "addition":
        additionSum += num;
        break;
      case "remainder":
        remainderSum += num;
        break;
    }
  }

  const total = initialSum + additionSum;
  const totalUsed = total - remainderSum;

  return {
    sectionId: section.id,
    label: section.label,
    group: section.group,
    total,
    totalUsed,
  };
}

export function computeSheetSummary(sheet: SheetWithEntries): SheetSummary {
  const sections = sheet.template.sections.filter((s) => s.isActive);
  const entryMap = new Map(
    sheet.entries.map((e) => [e.sectionId, e.values as Record<string, unknown>])
  );

  const sectionTotals: SectionTotals[] = sections.map((section) =>
    computeSectionTotals(section, entryMap.get(section.id) ?? {})
  );

  const groupMap = new Map<string, number>();
  for (const st of sectionTotals) {
    if (st.group) {
      groupMap.set(st.group, (groupMap.get(st.group) ?? 0) + st.totalUsed);
    }
  }

  const groupTotals: GroupTotals[] = Array.from(groupMap.entries()).map(([group, total]) => ({
    group,
    total,
  }));

  const grandTotal = sectionTotals.reduce((sum, st) => sum + st.totalUsed, 0);

  return { sectionTotals, groupTotals, grandTotal };
}
