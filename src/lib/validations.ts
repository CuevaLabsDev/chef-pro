import { z } from "zod";
import { PacketItemCategory, Role } from "@prisma/client";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/modules/identity-access/rbac-config";

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  roleSubtypeId: z.string().optional(),
  roleLabel: z.string().optional(),
  locationIds: z.array(z.string()).min(1, "At least one location is required"),
});

export const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  description: z.string().optional(),
});

export const createTastingPeriodSchema = z.object({
  name: z.string().min(1, "Period name is required"),
  sortOrder: z.number().int().min(0),
});

export const createDeadlineRuleSchema = z.object({
  locationId: z.string().min(1),
  tastingPeriodId: z.string().min(1),
  deadlineTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
});

export const createRatingSchemaInput = z.object({
  name: z.string().min(1),
  questions: z.array(
    z.object({
      label: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["star", "select", "text"]),
      scaleMin: z.number().optional(),
      scaleMax: z.number().optional(),
      options: z.array(z.string()).optional(),
      isRequired: z.boolean().default(true),
      sortOrder: z.number().int(),
    })
  ),
});

export const ratingResponseSchema = z.object({
  questionId: z.string().min(1),
  numericValue: z.number().optional(),
  textValue: z.string().optional(),
});

export const tastingItemSchema = z.object({
  dishName: z.string().min(1, "Dish name is required"),
  sortOrder: z.number().int().min(0),
  temperatureCompliance: z.enum(["compliant", "non_compliant", "not_checked"]),
  adjustmentsNeeded: z.string().optional(),
  ranOutTime: z.string().optional(),
  serviceGapMins: z.number().int().optional(),
  backupNotes: z.string().optional(),
  fteNotes: z.string().optional(),
  ratings: z.array(ratingResponseSchema),
});

export const createTastingSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  locationId: z.string().min(1),
  tastingPeriodId: z.string().min(1),
  menuSignagePacketId: z.string().optional(),
  managerName: z.string().optional(),
  menuName: z.string().optional(),
  checklistMenuPackage: z.boolean().optional(),
  checklistDigitalSignage: z.boolean().optional(),
  checklistFoodCards: z.boolean().optional(),
  checklistNotes: z.string().optional(),
  items: z.array(tastingItemSchema).min(1, "At least one item is required"),
});

export const updateTastingSessionSchema = z.object({
  menuSignagePacketId: z.string().nullable().optional(),
  managerName: z.string().optional(),
  menuName: z.string().optional(),
  checklistMenuPackage: z.boolean().optional(),
  checklistDigitalSignage: z.boolean().optional(),
  checklistFoodCards: z.boolean().optional(),
  checklistNotes: z.string().optional(),
  items: z.array(tastingItemSchema).optional(),
});

export const transitionSessionSchema = z.object({
  sessionId: z.string().min(1),
  toStatus: z.enum(["draft", "submitted", "reviewed", "locked"]),
  notes: z.string().optional(),
});

export const reviewFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  locationId: z.string().optional(),
  chefId: z.string().optional(),
  periodId: z.string().optional(),
  status: z.enum(["draft", "submitted", "reviewed", "locked"]).optional(),
});

const permissionKeySchema = z
  .string()
  .refine(
    (value): value is PermissionKey => ALL_PERMISSION_KEYS.includes(value as PermissionKey),
    "Invalid permission key"
  );

export const replaceSubtypePermissionsSchema = z.object({
  permissionKeys: z.array(permissionKeySchema).default([]),
});

export const updateUserPermissionsSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  roleSubtypeId: z.string().nullable().optional(),
  roleLabel: z.string().nullable().optional(),
  overrides: z
    .array(
      z.object({
        permissionKey: permissionKeySchema,
        isAllowed: z.boolean(),
      })
    )
    .optional(),
});

export const menuPacketItemSchema = z.object({
  category: z.nativeEnum(PacketItemCategory),
  itemName: z.string().min(1, "Item name is required"),
  ingredients: z.string().min(1, "Ingredients are required"),
  theme: z.string().optional(),
  dietTags: z.array(z.string()).default([]),
  allergenTags: z.array(z.string()).default([]),
  sortOrder: z.number().int().min(0),
  isReadyForService: z.boolean().optional(),
  wasUsed: z.boolean().optional(),
  notes: z.string().optional(),
});

export const createMenuSignagePacketSchema = z.object({
  date: z.string().min(1, "Date is required"),
  locationId: z.string().min(1, "Location is required"),
  meal: z.string().min(1, "Meal is required"),
  market: z.string().optional(),
  cafe: z.string().optional(),
  status: z.string().optional(),
  assignedChefId: z.string().optional(),
  checklistMenuPackage: z.boolean().optional(),
  checklistDigitalSignage: z.boolean().optional(),
  checklistFoodCards: z.boolean().optional(),
  checklistNotes: z.string().optional(),
  backupReady: z.boolean().optional(),
  backupUsed: z.boolean().optional(),
  backupNotes: z.string().optional(),
  tastingSessionId: z.string().optional(),
  items: z.array(menuPacketItemSchema).min(1, "At least one menu item is required"),
});

export const updateMenuSignagePacketStructureSchema = z.object({
  date: z.string().optional(),
  locationId: z.string().optional(),
  meal: z.string().optional(),
  market: z.string().optional(),
  cafe: z.string().optional(),
  status: z.string().optional(),
  assignedChefId: z.string().nullable().optional(),
  tastingSessionId: z.string().nullable().optional(),
  items: z.array(menuPacketItemSchema).optional(),
});

export const updateMenuSignagePacketExecutionSchema = z.object({
  status: z.string().optional(),
  checklistMenuPackage: z.boolean().optional(),
  checklistDigitalSignage: z.boolean().optional(),
  checklistFoodCards: z.boolean().optional(),
  checklistNotes: z.string().optional(),
  backupReady: z.boolean().optional(),
  backupUsed: z.boolean().optional(),
  backupNotes: z.string().optional(),
  itemExecution: z
    .array(
      z.object({
        id: z.string().min(1),
        isReadyForService: z.boolean().optional(),
        wasUsed: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

export const updateMenuSignagePacketSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("structure"),
    data: updateMenuSignagePacketStructureSchema,
  }),
  z.object({
    mode: z.literal("execution"),
    data: updateMenuSignagePacketExecutionSchema,
  }),
]);
