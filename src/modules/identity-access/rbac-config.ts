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
  {
    key: "counts.configure",
    name: "Configure Count Sheets",
    description: "Manage count sheet templates for assigned locations.",
  },
  {
    key: "counts.record",
    name: "Record Daily Counts",
    description: "Create, edit, and submit daily count sheets.",
  },
  {
    key: "counts.view",
    name: "View Daily Counts",
    description: "View daily count history and summaries.",
  },
  {
    key: "compliance.record",
    name: "Record Compliance Evidence",
    description: "Upload closing photos and temperature log evidence for assigned locations.",
  },
  {
    key: "compliance.view",
    name: "View Compliance Audits",
    description: "View AI-assisted closing verification and temperature log audits.",
  },
  {
    key: "compliance.manage",
    name: "Manage Compliance Audits",
    description: "Reanalyze audits and update AI-assisted compliance issue status.",
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
  rank: number;
  parentSubtypeCode: string | null;
  permissionKeys: PermissionKey[];
}

const chefBasePermissions: PermissionKey[] = [
  "tastings.create",
  "tastings.edit",
  "tastings.submit",
  "packets.read",
  "packets.execute",
  "packets.request_amendment",
  "compliance.record",
];

const executiveChefPermissions: PermissionKey[] = [
  ...chefBasePermissions,
  "tastings.view_all",
  "reviews.manage",
  "reports.view",
  "compliance.view",
];

const opsBasePermissions: PermissionKey[] = [
  "tastings.view_all",
  "config.manage",
  "reviews.manage",
  "reviews.unlock",
  "reports.view",
  "notifications.view",
  "packets.read",
  "packets.override",
  "compliance.record",
  "compliance.view",
  "compliance.manage",
];

const assistantOpsPermissions: PermissionKey[] = [
  "tastings.view_all",
  "reviews.manage",
  "reports.view",
  "notifications.view",
  "packets.read",
  "packets.override",
  "compliance.view",
];

export const DEFAULT_SUBTYPE_DEFINITIONS: DefaultSubtypeDefinition[] = [
  // FTE tier (rank 100+) — corporate/executive
  {
    role: "fte",
    code: "fte_ops",
    label: "FTE Ops",
    rank: 110,
    parentSubtypeCode: null,
    permissionKeys: ALL_PERMISSION_KEYS,
  },
  {
    role: "fte",
    code: "fte_chef",
    label: "FTE Chef",
    rank: 100,
    parentSubtypeCode: "fte_ops",
    permissionKeys: ALL_PERMISSION_KEYS,
  },

  // Operations tier (rank 50–59) — day-to-day management
  {
    role: "ops",
    code: "ops",
    label: "Ops",
    rank: 55,
    parentSubtypeCode: "fte_chef",
    permissionKeys: opsBasePermissions,
  },
  {
    role: "ops",
    code: "assistant_ops",
    label: "Assistant Ops",
    rank: 50,
    parentSubtypeCode: "ops",
    permissionKeys: assistantOpsPermissions,
  },

  // Chef tier (rank 10–40) — kitchen line
  {
    role: "chef",
    code: "executive",
    label: "Executive Chef",
    rank: 40,
    parentSubtypeCode: "fte_chef",
    permissionKeys: executiveChefPermissions,
  },
  {
    role: "chef",
    code: "sr_sous",
    label: "Sr. Sous",
    rank: 30,
    parentSubtypeCode: "executive",
    permissionKeys: chefBasePermissions,
  },
  {
    role: "chef",
    code: "sous",
    label: "Sous",
    rank: 20,
    parentSubtypeCode: "sr_sous",
    permissionKeys: chefBasePermissions,
  },
  {
    role: "chef",
    code: "jr_sous",
    label: "Jr. Sous",
    rank: 10,
    parentSubtypeCode: "sous",
    permissionKeys: chefBasePermissions,
  },

  // FOH tier (rank 60–65)
  {
    role: "foh",
    code: "foh_manager",
    label: "FOH Manager",
    rank: 65,
    parentSubtypeCode: "fte_chef",
    permissionKeys: [
      "packets.read",
      "packets.execute",
      "counts.configure",
      "counts.record",
      "counts.view",
      "compliance.record",
    ],
  },
  {
    role: "foh",
    code: "assistant_foh",
    label: "Assistant FOH",
    rank: 60,
    parentSubtypeCode: "foh_manager",
    permissionKeys: ["packets.read", "counts.record", "counts.view", "compliance.record"],
  },

  // Kitchen Admin tier (rank 70–75)
  {
    role: "kitchen_admin_manager",
    code: "kitchen_admin_manager",
    label: "Kitchen Admin Manager",
    rank: 75,
    parentSubtypeCode: "fte_chef",
    permissionKeys: [
      "packets.read",
      "packets.manage_structure",
      "kitchen_admins.manage",
      "kitchen_admins.view_as",
    ],
  },
  {
    role: "kitchen_admin",
    code: "kitchen_admin",
    label: "Kitchen Admin",
    rank: 70,
    parentSubtypeCode: "kitchen_admin_manager",
    permissionKeys: [
      "packets.read",
      "packets.manage_structure",
      "packets.publish",
      "packets.finalize_service",
      "packets.resolve_amendment",
    ],
  },
];
