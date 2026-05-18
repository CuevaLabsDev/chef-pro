import type { Prisma } from "@prisma/client";

export const OPERATIONAL_AUDIT_BUCKET = "operational-audit-assets";
export const MAX_OPERATIONAL_FILE_SIZE = 20 * 1024 * 1024;
export const ALLOWED_OPERATIONAL_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const CLOSING_PHOTO_CATEGORIES = [
  "station",
  "line",
  "walk_in",
  "dish_area",
  "storage",
] as const;

export type ClosingPhotoCategory = (typeof CLOSING_PHOTO_CATEGORIES)[number];
export type AuditType = "closing" | "temperature_log";
export type AuditStatus = "processing" | "completed" | "needs_review" | "failed";
export type HoldingType = "hot" | "cold" | "unknown";
export type ComplianceStatus = "compliant" | "potential_issue" | "needs_review";
export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export interface ComplianceRuleSet {
  version: string;
  source: string;
  coldMaxF: number;
  hotMinF: number;
  minConfidence: number;
}

export interface OperationalFileUpload {
  file: File;
  kind: "source" | "generated_pdf";
}

export interface ClosingPhotoUpload {
  category: ClosingPhotoCategory;
  file: File;
}

export interface TemperatureEntryInput {
  entryTime?: string | null;
  stationName?: string | null;
  itemName?: string | null;
  holdingType: HoldingType;
  temperatureRaw?: string | null;
  temperatureF?: number | null;
  unit?: string | null;
  initials?: string | null;
  notes?: string | null;
  confidence: number;
}

export interface IssueInput {
  severity: IssueSeverity;
  type: string;
  title: string;
  description: string;
  recommendation?: string | null;
  confidence?: number | null;
  ruleCode?: string | null;
}

export type OperationalAuditDetail = Prisma.OperationalAuditGetPayload<{
  include: {
    location: { select: { id: true; name: true } };
    submittedBy: { select: { id: true; name: true } };
    assets: true;
    closingPhotos: {
      include: {
        asset: true;
        issues: true;
      };
    };
    temperatureLog: {
      include: {
        sourceAsset: true;
        generatedPdfAsset: true;
        entries: {
          include: {
            issues: true;
          };
        };
      };
    };
    issues: true;
  };
}>;
