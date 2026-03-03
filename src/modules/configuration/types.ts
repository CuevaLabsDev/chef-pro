export interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TastingPeriod {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface DeadlineRule {
  id: string;
  locationId: string;
  tastingPeriodId: string;
  deadlineTime: string; // HH:mm format
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isActive: boolean;
}

export interface RatingSchema {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  questions: RatingQuestion[];
  createdAt: Date;
}

export interface RatingQuestion {
  id: string;
  schemaId: string;
  label: string;
  description?: string;
  type: "star" | "select" | "text";
  scaleMin?: number;
  scaleMax?: number;
  options?: string[];
  isRequired: boolean;
  sortOrder: number;
}

export interface CreateLocationInput {
  name: string;
  description?: string;
}

export interface CreateTastingPeriodInput {
  name: string;
  sortOrder: number;
}

export interface CreateDeadlineRuleInput {
  locationId: string;
  tastingPeriodId: string;
  deadlineTime: string;
  daysOfWeek: number[];
}

export interface CreateRatingSchemaInput {
  name: string;
  questions: Omit<RatingQuestion, "id" | "schemaId">[];
}
