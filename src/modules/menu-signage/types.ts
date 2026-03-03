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
  { value: "desserts", label: "Desserts" },
  { value: "back_up", label: "Back-Up" },
];

export type MenuPacketCategoryOption = (typeof MENU_PACKET_CATEGORY_OPTIONS)[number];

export interface CreateMenuSignageItemInput {
  category: PacketItemCategory;
  itemName: string;
  ingredients: string;
  theme?: string;
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
  market?: string;
  cafe?: string;
  status?: string;
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
  market?: string;
  cafe?: string;
  status?: string;
  assignedChefId?: string | null;
  tastingSessionId?: string | null;
  items?: CreateMenuSignageItemInput[];
}

export interface UpdateMenuSignagePacketExecutionInput {
  status?: string;
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

export interface MenuSignageFilters {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  meal?: string;
  status?: string;
  assignedChefId?: string;
}
