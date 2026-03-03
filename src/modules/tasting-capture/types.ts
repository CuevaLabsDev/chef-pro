export type SessionStatus = "draft" | "submitted" | "reviewed" | "locked";

export type TemperatureCompliance = "compliant" | "non_compliant" | "not_checked";

export interface TastingSession {
  id: string;
  date: Date;
  locationId: string;
  tastingPeriodId: string;
  chefId: string;
  managerName?: string;
  menuName?: string;
  status: SessionStatus;
  checklistMenuPackage: boolean;
  checklistDigitalSignage: boolean;
  checklistFoodCards: boolean;
  checklistNotes?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: TastingItem[];
}

export interface TastingItem {
  id: string;
  sessionId: string;
  dishName: string;
  sortOrder: number;
  temperatureCompliance: TemperatureCompliance;
  adjustmentsNeeded?: string;
  ranOutTime?: string;
  serviceGapMins?: number;
  backupNotes?: string;
  fteNotes?: string;
  photoUrl?: string;
  ratings: RatingResponse[];
}

export interface RatingResponse {
  id: string;
  itemId: string;
  questionId: string;
  numericValue?: number;
  textValue?: string;
}

export interface CreateTastingSessionInput {
  date: string;
  locationId: string;
  tastingPeriodId: string;
  menuSignagePacketId?: string;
  managerName?: string;
  menuName?: string;
  checklistMenuPackage?: boolean;
  checklistDigitalSignage?: boolean;
  checklistFoodCards?: boolean;
  checklistNotes?: string;
  items: CreateTastingItemInput[];
}

export interface CreateTastingItemInput {
  dishName: string;
  sortOrder: number;
  temperatureCompliance: TemperatureCompliance;
  adjustmentsNeeded?: string;
  ranOutTime?: string;
  serviceGapMins?: number;
  backupNotes?: string;
  fteNotes?: string;
  ratings: CreateRatingResponseInput[];
}

export interface CreateRatingResponseInput {
  questionId: string;
  numericValue?: number;
  textValue?: string;
}

export interface UpdateTastingSessionInput {
  menuSignagePacketId?: string | null;
  managerName?: string;
  menuName?: string;
  checklistMenuPackage?: boolean;
  checklistDigitalSignage?: boolean;
  checklistFoodCards?: boolean;
  checklistNotes?: string;
  items?: CreateTastingItemInput[];
}
