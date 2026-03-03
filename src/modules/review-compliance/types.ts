import type { SessionStatus } from "../tasting-capture/types";

export interface ReviewAction {
  id: string;
  sessionId: string;
  reviewerId: string;
  fromStatus: SessionStatus;
  toStatus: SessionStatus;
  notes?: string;
  createdAt: Date;
}

export interface ComplianceSummary {
  locationId: string;
  locationName: string;
  date: string;
  periodId: string;
  periodName: string;
  totalExpected: number;
  totalSubmitted: number;
  totalReviewed: number;
  totalLate: number;
  totalMissing: number;
  complianceRate: number;
}

export interface ReviewFilters {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  chefId?: string;
  periodId?: string;
  status?: SessionStatus;
}

export interface TransitionSessionInput {
  sessionId: string;
  toStatus: SessionStatus;
  notes?: string;
}
