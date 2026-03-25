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
  name: z.string().trim().min(1, "Location name is required"),
  description: z.string().optional(),
  buildingId: z.string().optional(),
});

export const updateLocationSchema = z
  .object({
    name: z.string().trim().min(1, "Location name is required").optional(),
    description: z.string().nullable().optional(),
    buildingId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.buildingId !== undefined ||
      data.isActive !== undefined,
    { message: "At least one field is required" }
  );

export const assignManagerSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const replaceLocationAccessSchema = z.object({
  locationIds: z.array(z.string()).default([]),
});

export const updateManagerRoleSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  roleSubtypeId: z.string().nullable().optional(),
  roleLabel: z.string().nullable().optional(),
});

export const createCampusSchema = z.object({
  name: z.string().trim().min(1, "Campus name is required"),
});

export const updateCampusSchema = z
  .object({
    name: z.string().trim().min(1, "Campus name is required").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: "At least one field is required",
  });

export const createBuildingSchema = z.object({
  name: z.string().trim().min(1, "Building name is required"),
  campusId: z.string().min(1, "Campus is required"),
});

export const updateBuildingSchema = z
  .object({
    name: z.string().trim().min(1, "Building name is required").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: "At least one field is required",
  });

export const createTastingPeriodSchema = z.object({
  name: z.string().min(1, "Period name is required"),
  sortOrder: z.number().int().min(0),
});

const hhmmRegex = /^\d{2}:\d{2}$/;

export const createDeadlineRuleSchema = z.object({
  locationId: z.string().min(1),
  tastingPeriodId: z.string().min(1),
  deadlineTime: z.string().regex(hhmmRegex, "Must be HH:mm format"),
  packetDueTime: z.string().regex(hhmmRegex, "Must be HH:mm format").optional(),
  tastingStart: z.string().regex(hhmmRegex, "Must be HH:mm format").optional(),
  tastingEnd: z.string().regex(hhmmRegex, "Must be HH:mm format").optional(),
  serviceStart: z.string().regex(hhmmRegex, "Must be HH:mm format").optional(),
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
  serviceGapMins: z.number().int().optional(),
  ratings: z.array(ratingResponseSchema),
});

export const createTastingSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  locationId: z.string().min(1),
  tastingPeriodId: z.string().min(1),
  menuSignagePacketId: z.string().optional(),
  checklistMenuPackage: z.boolean().optional(),
  checklistDigitalSignage: z.boolean().optional(),
  checklistFoodCards: z.boolean().optional(),
  checklistNotes: z.string().optional(),
  items: z.array(tastingItemSchema).min(1, "At least one item is required"),
});

export const updateTastingSessionSchema = z.object({
  menuSignagePacketId: z.string().nullable().optional(),
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
  managedKitchenAdminIds: z.array(z.string()).optional(),
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
  dietTags: z.array(z.string()).default([]),
  allergenTags: z.array(z.string()).default([]),
  sortOrder: z.number().int().min(0),
  isReadyForService: z.boolean().optional(),
  wasUsed: z.boolean().optional(),
  notes: z.string().optional(),
});

const menuPacketStatusSchema = z.enum([
  "draft",
  "published",
  "for_final_review",
  "finalized_for_service",
  // legacy statuses kept for backward compatibility
  "ready",
  "in_service",
  "completed",
]);

export const createMenuSignagePacketSchema = z.object({
  date: z.string().min(1, "Date is required"),
  locationId: z.string().min(1, "Location is required"),
  meal: z.string().min(1, "Meal is required"),
  theme: z.string().optional(),
  status: menuPacketStatusSchema.optional(),
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
  theme: z.string().optional(),
  status: menuPacketStatusSchema.optional(),
  assignedChefId: z.string().nullable().optional(),
  tastingSessionId: z.string().nullable().optional(),
  items: z.array(menuPacketItemSchema).optional(),
});

export const updateMenuSignagePacketExecutionSchema = z.object({
  status: menuPacketStatusSchema.optional(),
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

export const addPacketSignatureSchema = z.object({
  typedName: z.string().trim().min(1, "Signature name is required"),
  acknowledged: z.boolean().refine((value) => value === true, "Please confirm before signing."),
});

export const publishMenuSignagePacketSchema = z.object({
  note: z.string().optional(),
});

export const submitPacketForFinalReviewSchema = z.object({
  note: z.string().optional(),
});

export const finalizePacketForServiceSchema = z.object({
  typedName: z.string().trim().min(1, "Signature name is required"),
  acknowledged: z.boolean().refine((value) => value === true, "Please confirm before finalizing."),
  note: z.string().optional(),
});

export const createPacketAmendmentSchema = z.object({
  type: z.enum(["item_change", "backup_swap", "item_removed", "item_added"]),
  reason: z.enum(["tasting_feedback", "prep_change", "service_change", "correction"]),
  description: z.string().min(1, "Description is required"),
  itemId: z.string().optional(),
});

export const resolvePacketAmendmentSchema = z.object({
  status: z.enum(["applied", "dismissed"]),
});

export const updateDeadlineRuleSchema = z.object({
  deadlineTime: z.string().regex(hhmmRegex, "Must be HH:mm format").optional(),
  packetDueTime: z.string().regex(hhmmRegex, "Must be HH:mm format").nullable().optional(),
  tastingStart: z.string().regex(hhmmRegex, "Must be HH:mm format").nullable().optional(),
  tastingEnd: z.string().regex(hhmmRegex, "Must be HH:mm format").nullable().optional(),
  serviceStart: z.string().regex(hhmmRegex, "Must be HH:mm format").nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
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
  z.object({
    mode: z.literal("publish"),
    data: publishMenuSignagePacketSchema,
  }),
  z.object({
    mode: z.literal("submit_for_final_review"),
    data: submitPacketForFinalReviewSchema,
  }),
  z.object({
    mode: z.literal("add_signature"),
    data: addPacketSignatureSchema,
  }),
  z.object({
    mode: z.literal("finalize_for_service"),
    data: finalizePacketForServiceSchema,
  }),
]);
