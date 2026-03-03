export type ReportType = "compliance_summary" | "detail_export" | "trend_analysis";
export type ExportFormat = "csv" | "pdf";

export interface ExportJob {
  id: string;
  type: ReportType;
  format: ExportFormat;
  filters: Record<string, unknown>;
  requestedById: string;
  status: "queued" | "processing" | "completed" | "failed";
  fileUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  locationIds?: string[];
  chefIds?: string[];
  periodIds?: string[];
}
