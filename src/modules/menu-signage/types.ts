import type { PacketItemCategory } from "@prisma/client";

export const MENU_PACKET_CATEGORY_OPTIONS: {
  value: PacketItemCategory;
  label: string;
}[] = [
  { value: "entree", label: "Entree" },
  { value: "vegetarian_entree", label: "Vegetarian Entree" },
  { value: "vegan_entree", label: "Vegan Entree" },
  { value: "starches", label: "Starches" },
  { value: "vegetables", label: "Vegetables" },
  { value: "sides", label: "Sides" },
  { value: "pastry", label: "Pastry" },
  { value: "back_up", label: "Back-Up" },
];

export const MENU_PACKET_STATUS_OPTIONS = [
  { value: "draft", label: "Building" },
  { value: "published", label: "Ready for Review" },
  { value: "for_final_review", label: "In Review" },
  { value: "finalized_for_service", label: "Approved" },
] as const;

export const STATUS_DISPLAY_LABEL: Record<string, string> = {
  draft: "Building",
  published: "Ready for Review",
  for_final_review: "In Review",
  finalized_for_service: "Approved",
  ready: "Ready",
  in_service: "In Service",
  completed: "Completed",
};

export const MENU_PACKET_DIET_TAG_OPTIONS = [
  "Contains Pork",
  "Non-Vegetarian",
  "Vegan",
  "Vegetarian",
  "Halal",
  "Contains Gluten",
] as const;

export const MENU_PACKET_ALLERGEN_OPTIONS = [
  "Alcohol",
  "Crustaceans",
  "Eggs",
  "Fish",
  "Gluten",
  "Milk",
  "Nuts",
  "Peanuts",
  "Sesame",
  "Soybeans",
  "Spicy",
] as const;

export type MenuPacketCategoryOption = (typeof MENU_PACKET_CATEGORY_OPTIONS)[number];
export type MenuPacketStatusOption = (typeof MENU_PACKET_STATUS_OPTIONS)[number];
export type MenuPacketStatus =
  | MenuPacketStatusOption["value"]
  | "ready"
  | "in_service"
  | "completed";

export interface CreateMenuSignageItemInput {
  category: PacketItemCategory;
  itemName: string;
  ingredients: string;
  dietTags?: string[];
  allergenTags?: string[];
  sortOrder: number;
  isReadyForService?: boolean;
  wasUsed?: boolean;
  notes?: string;
}

export interface CreateMenuSignagePacketInput {
  date: string;
  locationId: string;
  meal: string;
  theme?: string;
  status?: MenuPacketStatus;
  assignedChefId?: string;
  checklistMenuPackage?: boolean;
  checklistDigitalSignage?: boolean;
  checklistFoodCards?: boolean;
  checklistNotes?: string;
  backupReady?: boolean;
  backupUsed?: boolean;
  backupNotes?: string;
  tastingSessionId?: string;
  items: CreateMenuSignageItemInput[];
}

export interface UpdateMenuSignagePacketStructureInput {
  date?: string;
  locationId?: string;
  meal?: string;
  theme?: string;
  status?: MenuPacketStatus;
  assignedChefId?: string | null;
  tastingSessionId?: string | null;
  items?: CreateMenuSignageItemInput[];
}

export interface UpdateMenuSignagePacketExecutionInput {
  status?: MenuPacketStatus;
  checklistMenuPackage?: boolean;
  checklistDigitalSignage?: boolean;
  checklistFoodCards?: boolean;
  checklistNotes?: string;
  backupReady?: boolean;
  backupUsed?: boolean;
  backupNotes?: string;
  itemExecution?: {
    id: string;
    isReadyForService?: boolean;
    wasUsed?: boolean;
    notes?: string;
  }[];
}

export interface AddPacketSignatureInput {
  typedName: string;
  acknowledged: boolean;
}

export interface PublishMenuSignagePacketInput {
  note?: string;
}

export interface SubmitPacketForFinalReviewInput {
  note?: string;
}

export interface FinalizePacketForServiceInput {
  typedName: string;
  acknowledged: boolean;
  note?: string;
}

export interface MenuSignageFilters {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  meal?: string;
  status?: string;
  assignedChefId?: string;
}

export type AmendmentType = "item_change" | "backup_swap" | "item_removed" | "item_added";
export type AmendmentReason = "tasting_feedback" | "prep_change" | "service_change" | "correction";
export type AmendmentStatus = "pending" | "applied" | "dismissed";

export const AMENDMENT_TYPE_LABELS: Record<AmendmentType, string> = {
  item_change: "Dish update",
  backup_swap: "Backup swap",
  item_removed: "Dish removed",
  item_added: "Dish added",
};

export const AMENDMENT_REASON_LABELS: Record<AmendmentReason, string> = {
  tasting_feedback: "From tasting",
  prep_change: "During prep",
  service_change: "During service",
  correction: "Correction",
};

export const AMENDMENT_STATUS_LABELS: Record<AmendmentStatus, string> = {
  pending: "Waiting",
  applied: "Done",
  dismissed: "Skipped",
};

export interface CreatePacketAmendmentInput {
  type: AmendmentType;
  reason: AmendmentReason;
  description: string;
  itemId?: string;
}

export interface ResolvePacketAmendmentInput {
  status: "applied" | "dismissed";
}
