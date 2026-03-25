import type { Role } from "@prisma/client";

export const PERMISSION_CATALOG = [
  {
    key: "tastings.create",
    name: "Create Tastings",
    description: "Create new tasting sessions.",
  },
  {
    key: "tastings.edit",
    name: "Edit Tastings",
    description: "Edit existing tasting sessions before lock.",
  },
  {
    key: "tastings.submit",
    name: "Submit Tastings",
    description: "Submit tasting sessions for review.",
  },
  {
    key: "tastings.view_all",
    name: "View All Tastings",
    description: "View tastings across all chefs.",
  },
  {
    key: "config.manage",
    name: "Manage Configuration",
    description: "Manage locations, periods, deadlines, and schemas.",
  },
  {
    key: "reviews.manage",
    name: "Manage Reviews",
    description: "Transition tasting sessions in review workflow.",
  },
  {
    key: "reviews.unlock",
    name: "Unlock Sessions",
    description: "Unlock locked tasting sessions.",
  },
  {
    key: "reports.view",
    name: "View Reports",
    description: "Access compliance and export reports.",
  },
  {
    key: "notifications.view",
    name: "View Notifications",
    description: "View operational notifications.",
  },
  {
    key: "packets.read",
    name: "Read Menu Packets",
    description: "View menu signage packets.",
  },
  {
    key: "packets.manage_structure",
    name: "Manage Packet Structure",
    description: "Create and edit packet items and metadata.",
  },
  {
    key: "packets.execute",
    name: "Execute Packets",
    description: "Update execution checklist and backup usage fields.",
  },
  {
    key: "packets.override",
    name: "Override Packets",
    description: "Override packet workflow states and assignments.",
  },
  {
    key: "packets.publish",
    name: "Publish Packets",
    description: "Publish packets so location teams can review them.",
  },
  {
    key: "packets.finalize_service",
    name: "Finalize Packets for Service",
    description: "Finalize reviewed packets for service.",
  },
  {
    key: "kitchen_admins.manage",
    name: "Manage Kitchen Admin Team",
    description: "Assign kitchen admins and location access.",
  },
  {
    key: "kitchen_admins.view_as",
    name: "View as Kitchen Admin",
    description: "Use focused support view for kitchen admin workflows.",
  },
  {
    key: "permissions.manage",
    name: "Manage Permissions",
    description: "Manage subtype defaults and user permission overrides.",
  },
  {
    key: "packets.request_amendment",
    name: "Request Packet Amendment",
    description: "Request changes to a signage packet (during tasting or service).",
  },
  {
    key: "packets.resolve_amendment",
    name: "Resolve Packet Amendment",
    description: "Apply or dismiss a packet amendment request.",
  },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map(
  (permission) => permission.key
);

export interface DefaultSubtypeDefinition {
  role: Role;
  code: string;
  label: string;
  permissionKeys: PermissionKey[];
}

const chefBasePermissions: PermissionKey[] = [
  "tastings.create",
  "tastings.edit",
  "tastings.submit",
  "packets.read",
  "packets.execute",
  "packets.request_amendment",
];

export const DEFAULT_SUBTYPE_DEFINITIONS: DefaultSubtypeDefinition[] = [
  {
    role: "chef",
    code: "jr_sous",
    label: "Jr. Sous",
    permissionKeys: chefBasePermissions,
  },
  {
    role: "chef",
    code: "sous",
    label: "Sous",
    permissionKeys: chefBasePermissions,
  },
  {
    role: "chef",
    code: "sr_sous",
    label: "Sr. Sous",
    permissionKeys: chefBasePermissions,
  },
  {
    role: "foh",
    code: "foh_manager",
    label: "FOH Manager",
    permissionKeys: ["packets.read", "packets.execute"],
  },
  {
    role: "foh",
    code: "assistant_foh",
    label: "Assistant FOH",
    permissionKeys: ["packets.read"],
  },
  {
    role: "ops",
    code: "ops",
    label: "Ops",
    permissionKeys: [
      "tastings.view_all",
      "config.manage",
      "reviews.manage",
      "reviews.unlock",
      "reports.view",
      "notifications.view",
      "packets.read",
      "packets.override",
    ],
  },
  {
    role: "kitchen_admin",
    code: "kitchen_admin",
    label: "Kitchen Admin",
    permissionKeys: [
      "packets.read",
      "packets.manage_structure",
      "packets.publish",
      "packets.finalize_service",
      "packets.resolve_amendment",
    ],
  },
  {
    role: "kitchen_admin_manager",
    code: "kitchen_admin_manager",
    label: "Kitchen Admin Manager",
    permissionKeys: [
      "packets.read",
      "packets.manage_structure",
      "kitchen_admins.manage",
      "kitchen_admins.view_as",
    ],
  },
  {
    role: "fte",
    code: "cafe_chef",
    label: "Cafe Chef",
    permissionKeys: ALL_PERMISSION_KEYS,
  },
  {
    role: "fte",
    code: "fte_ops",
    label: "FTE Ops",
    permissionKeys: ALL_PERMISSION_KEYS,
  },
];
