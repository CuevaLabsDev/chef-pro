import type { Prisma } from "@prisma/client";

export type FieldType = "number" | "text" | "time";
export type FieldRole = "initial" | "addition" | "remainder" | "label";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  role?: FieldRole;
}

export interface SectionInput {
  label: string;
  group?: string | null;
  fields: FieldDefinition[];
  sortOrder: number;
}

export interface UpsertTemplateInput {
  locationId: string;
  tastingPeriodId: string;
  sections: SectionInput[];
}

export interface EntryValues {
  [key: string]: string | number | null;
}

export interface EntryInput {
  sectionId: string;
  values: EntryValues;
}

export interface SectionTotals {
  sectionId: string;
  label: string;
  group: string | null;
  total: number;
  totalUsed: number;
}

export interface GroupTotals {
  group: string;
  total: number;
}

export interface SheetSummary {
  sectionTotals: SectionTotals[];
  groupTotals: GroupTotals[];
  grandTotal: number;
}

export type TemplateWithSections = Prisma.CountSheetTemplateGetPayload<{
  include: {
    sections: true;
    location: { select: { id: true; name: true } };
    tastingPeriod: { select: { id: true; name: true } };
  };
}>;

export type SheetWithEntries = Prisma.DailyCountSheetGetPayload<{
  include: {
    entries: { include: { section: true } };
    template: {
      include: {
        sections: true;
        location: { select: { id: true; name: true } };
        tastingPeriod: { select: { id: true; name: true } };
      };
    };
    submittedBy: { select: { id: true; name: true } };
    amendedBy: { select: { id: true; name: true } };
  };
}>;
