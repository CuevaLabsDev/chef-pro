import bcrypt from "bcryptjs";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_SUBTYPE_DEFINITIONS,
  PERMISSION_CATALOG,
  type PermissionKey,
} from "./rbac-config";
import type { CreateUserInput, EffectiveUserContext, PermissionOverrideInput } from "./types";

const userContextInclude = Prisma.validator<Prisma.UserInclude>()({
  locationAccess: true,
  kitchenAdminManagerLinks: {
    select: {
      kitchenAdminId: true,
    },
  },
  roleSubtype: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
  permissionRules: {
    include: { permission: true },
  },
});

type UserWithContext = Prisma.UserGetPayload<{
  include: typeof userContextInclude;
}>;

const fallbackRolePermissions: Record<Role, PermissionKey[]> = {
  chef: ["tastings.create", "tastings.edit", "tastings.submit", "packets.read", "packets.execute"],
  foh: ["packets.read"],
  kitchen_admin: [
    "packets.read",
    "packets.manage_structure",
    "packets.publish",
    "packets.finalize_service",
  ],
  kitchen_admin_manager: [
    "packets.read",
    "packets.manage_structure",
    "kitchen_admins.manage",
    "kitchen_admins.view_as",
  ],
  ops: [
    "tastings.view_all",
    "config.manage",
    "reviews.manage",
    "reviews.unlock",
    "reports.view",
    "notifications.view",
    "packets.read",
    "packets.override",
  ],
  fte: ALL_PERMISSION_KEYS,
};

function isPermissionKey(value: string): value is PermissionKey {
  return ALL_PERMISSION_KEYS.includes(value as PermissionKey);
}

function toEffectivePermissions(user: UserWithContext): PermissionKey[] {
  const permissionMap = new Map<PermissionKey, boolean>();

  for (const rolePermission of fallbackRolePermissions[user.role] ?? []) {
    permissionMap.set(rolePermission, true);
  }

  for (const defaultPermission of user.roleSubtype?.permissions ?? []) {
    const key = defaultPermission.permission.key;
    if (isPermissionKey(key)) {
      permissionMap.set(key, defaultPermission.isAllowed);
    }
  }

  for (const override of user.permissionRules) {
    const key = override.permission.key;
    if (isPermissionKey(key)) {
      permissionMap.set(key, override.isAllowed);
    }
  }

  return ALL_PERMISSION_KEYS.filter((key) => permissionMap.get(key) === true);
}

function toEffectiveContext(user: UserWithContext): EffectiveUserContext {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleSubtypeId: user.roleSubtypeId,
    roleLabel: user.roleLabel,
    locationIds: user.locationAccess.map((la) => la.locationId),
    permissionKeys: toEffectivePermissions(user),
  };
}

export function hasPermission(user: EffectiveUserContext, permissionKey: PermissionKey) {
  return user.permissionKeys.includes(permissionKey);
}

export function hasAnyPermission(user: EffectiveUserContext, permissionKeys: PermissionKey[]) {
  return permissionKeys.some((permissionKey) => user.permissionKeys.includes(permissionKey));
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      roleSubtypeId: input.roleSubtypeId,
      roleLabel: input.roleLabel,
      locationAccess: {
        create: input.locationIds.map((locationId) => ({ locationId })),
      },
    },
    include: userContextInclude,
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: userContextInclude,
  });
}

export async function getUserContextById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: userContextInclude,
  });

  if (!user || !user.isActive) return null;
  return toEffectiveContext(user);
}

export async function getUsersByRole(role: Role) {
  return prisma.user.findMany({
    where: { role, isActive: true },
    include: userContextInclude,
    orderBy: { name: "asc" },
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    include: userContextInclude,
    orderBy: { name: "asc" },
  });
}

export async function getUsersWithEffectivePermissions() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: userContextInclude,
    orderBy: { name: "asc" },
  });

  return users.map((user) => ({
    ...toEffectiveContext(user),
    managedKitchenAdminIds: user.kitchenAdminManagerLinks.map((link) => link.kitchenAdminId),
    overrideRules: user.permissionRules.map((rule) => ({
      permissionKey: rule.permission.key,
      isAllowed: rule.isAllowed,
    })),
  }));
}

export async function getManagedKitchenAdminSummaries(managerId: string) {
  const assignments = await prisma.kitchenAdminManagerAssignment.findMany({
    where: {
      managerId,
      kitchenAdmin: { isActive: true, role: "kitchen_admin" },
    },
    include: {
      kitchenAdmin: {
        include: {
          locationAccess: {
            include: { location: true },
          },
        },
      },
    },
    orderBy: { kitchenAdmin: { name: "asc" } },
  });

  return assignments.map((assignment) => ({
    id: assignment.kitchenAdmin.id,
    name: assignment.kitchenAdmin.name,
    email: assignment.kitchenAdmin.email,
    roleLabel: assignment.kitchenAdmin.roleLabel,
    locationIds: assignment.kitchenAdmin.locationAccess.map((entry) => entry.locationId),
    locations: assignment.kitchenAdmin.locationAccess.map((entry) => ({
      id: entry.location.id,
      name: entry.location.name,
    })),
    assignedAt: assignment.createdAt,
  }));
}

export async function isKitchenAdminManagedBy(managerId: string, kitchenAdminId: string) {
  const assignment = await prisma.kitchenAdminManagerAssignment.findUnique({
    where: {
      managerId_kitchenAdminId: {
        managerId,
        kitchenAdminId,
      },
    },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function getManagedKitchenAdminContextForManager(
  managerId: string,
  kitchenAdminId: string
) {
  const isManaged = await isKitchenAdminManagedBy(managerId, kitchenAdminId);
  if (!isManaged) return null;

  const kitchenAdminContext = await getUserContextById(kitchenAdminId);
  if (!kitchenAdminContext || kitchenAdminContext.role !== "kitchen_admin") {
    return null;
  }

  return kitchenAdminContext;
}

export async function setManagedKitchenAdmins(managerId: string, kitchenAdminIds: string[]) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, role: true, isActive: true },
  });
  if (!manager || !manager.isActive) {
    throw new Error("Manager user not found");
  }
  if (manager.role !== "kitchen_admin_manager") {
    throw new Error("Selected user is not a kitchen admin manager");
  }

  const dedupedKitchenAdminIds = Array.from(
    new Set(kitchenAdminIds.map((value) => value.trim()).filter(Boolean))
  );

  if (dedupedKitchenAdminIds.length > 0) {
    const kitchenAdmins = await prisma.user.findMany({
      where: {
        id: { in: dedupedKitchenAdminIds },
        role: "kitchen_admin",
        isActive: true,
      },
      select: { id: true },
    });
    if (kitchenAdmins.length !== dedupedKitchenAdminIds.length) {
      throw new Error("One or more selected kitchen admins are invalid or inactive");
    }
  }

  await prisma.$transaction(async (tx) => {
    if (dedupedKitchenAdminIds.length === 0) {
      await tx.kitchenAdminManagerAssignment.deleteMany({
        where: { managerId },
      });
    } else {
      await tx.kitchenAdminManagerAssignment.deleteMany({
        where: {
          managerId,
          kitchenAdminId: { notIn: dedupedKitchenAdminIds },
        },
      });
    }

    await Promise.all(
      dedupedKitchenAdminIds.map((kitchenAdminId) =>
        tx.kitchenAdminManagerAssignment.upsert({
          where: {
            managerId_kitchenAdminId: {
              managerId,
              kitchenAdminId,
            },
          },
          update: {},
          create: {
            managerId,
            kitchenAdminId,
          },
        })
      )
    );
  });

  return getManagedKitchenAdminSummaries(managerId);
}

export async function clearManagedKitchenAdmins(managerId: string) {
  await prisma.kitchenAdminManagerAssignment.deleteMany({
    where: { managerId },
  });
}

export async function getOpsAndFteUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["ops", "fte"] }, isActive: true },
  });
}

export async function ensurePermissionCatalog() {
  await Promise.all(
    PERMISSION_CATALOG.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          name: permission.name,
          description: permission.description,
        },
        create: {
          key: permission.key,
          name: permission.name,
          description: permission.description,
        },
      })
    )
  );
}

export async function ensureDefaultRoleSubtypes() {
  await ensurePermissionCatalog();

  const permissions = await prisma.permission.findMany({
    where: { key: { in: ALL_PERMISSION_KEYS } },
  });
  const permissionIdByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id])
  );

  for (const subtype of DEFAULT_SUBTYPE_DEFINITIONS) {
    const savedSubtype = await prisma.roleSubtype.upsert({
      where: {
        role_code: { role: subtype.role, code: subtype.code },
      },
      update: {
        label: subtype.label,
        rank: subtype.rank,
        parentSubtypeCode: subtype.parentSubtypeCode,
        isActive: true,
      },
      create: {
        role: subtype.role,
        code: subtype.code,
        label: subtype.label,
        rank: subtype.rank,
        parentSubtypeCode: subtype.parentSubtypeCode,
      },
    });

    await prisma.roleSubtypePermission.deleteMany({
      where: {
        subtypeId: savedSubtype.id,
        permission: { key: { notIn: subtype.permissionKeys } },
      },
    });

    await Promise.all(
      subtype.permissionKeys.map((permissionKey) => {
        const permissionId = permissionIdByKey.get(permissionKey);
        if (!permissionId) return Promise.resolve(null);

        return prisma.roleSubtypePermission.upsert({
          where: {
            subtypeId_permissionId: {
              subtypeId: savedSubtype.id,
              permissionId,
            },
          },
          update: { isAllowed: true },
          create: {
            subtypeId: savedSubtype.id,
            permissionId,
            isAllowed: true,
          },
        });
      })
    );
  }
}

export async function getPermissionCatalog() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function getRoleSubtypesWithDefaults() {
  const subtypes = await prisma.roleSubtype.findMany({
    where: { isActive: true },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: [{ role: "asc" }, { rank: "desc" }, { label: "asc" }],
  });

  return subtypes.map((subtype) => ({
    id: subtype.id,
    role: subtype.role,
    code: subtype.code,
    label: subtype.label,
    rank: subtype.rank,
    parentSubtypeCode: subtype.parentSubtypeCode,
    permissionKeys: subtype.permissions
      .filter((entry) => entry.isAllowed && isPermissionKey(entry.permission.key))
      .map((entry) => entry.permission.key as PermissionKey),
  }));
}

export async function getRoleSubtypeById(id: string) {
  return prisma.roleSubtype.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
    },
  });
}

export async function replaceSubtypePermissionDefaults(
  subtypeId: string,
  permissionKeys: PermissionKey[]
) {
  const dedupedKeys = Array.from(new Set(permissionKeys));
  const permissions = await prisma.permission.findMany({
    where: { key: { in: dedupedKeys } },
  });
  const permissionIdByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id])
  );

  await prisma.roleSubtypePermission.deleteMany({
    where: {
      subtypeId,
      permission: { key: { notIn: dedupedKeys } },
    },
  });

  await Promise.all(
    dedupedKeys.map((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) return Promise.resolve(null);

      return prisma.roleSubtypePermission.upsert({
        where: {
          subtypeId_permissionId: {
            subtypeId,
            permissionId,
          },
        },
        update: { isAllowed: true },
        create: {
          subtypeId,
          permissionId,
          isAllowed: true,
        },
      });
    })
  );
}

export async function setUserPermissionOverrides(
  userId: string,
  overrides: PermissionOverrideInput[]
) {
  const overrideMap = new Map<PermissionKey, boolean>();
  for (const override of overrides) {
    overrideMap.set(override.permissionKey, override.isAllowed);
  }

  const permissionKeys = Array.from(overrideMap.keys());
  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });
  const permissionIdByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id])
  );

  await prisma.userPermissionOverride.deleteMany({
    where: {
      userId,
      permission: { key: { notIn: permissionKeys } },
    },
  });

  await Promise.all(
    permissionKeys.map((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) return Promise.resolve(null);

      return prisma.userPermissionOverride.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId,
          },
        },
        update: { isAllowed: overrideMap.get(permissionKey) ?? false },
        create: {
          userId,
          permissionId,
          isAllowed: overrideMap.get(permissionKey) ?? false,
        },
      });
    })
  );
}

export async function getLocationManagers(locationId: string) {
  const accessRecords = await prisma.userLocationAccess.findMany({
    where: { locationId },
    include: {
      user: {
        include: {
          roleSubtype: true,
          permissionRules: { include: { permission: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return accessRecords.map((record) => ({
    id: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.user.role,
    roleLabel: record.user.roleLabel,
    roleSubtype: record.user.roleSubtype
      ? {
          id: record.user.roleSubtype.id,
          label: record.user.roleSubtype.label,
          code: record.user.roleSubtype.code,
        }
      : null,
    isActive: record.user.isActive,
    assignedAt: record.createdAt,
  }));
}

export async function getAssignableUsers(locationId: string) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      locationAccess: { none: { locationId } },
    },
    include: { roleSubtype: true },
    orderBy: { name: "asc" },
  });
}

export async function assignUserToLocation(userId: string, locationId: string) {
  return prisma.userLocationAccess.create({
    data: { userId, locationId },
  });
}

export async function removeUserFromLocation(userId: string, locationId: string) {
  return prisma.userLocationAccess.delete({
    where: { userId_locationId: { userId, locationId } },
  });
}

export async function replaceUserLocationAccess(userId: string, locationIds: string[]) {
  const dedupedLocationIds = Array.from(
    new Set(locationIds.map((locationId) => locationId.trim()).filter(Boolean))
  );

  await prisma.$transaction(async (tx) => {
    if (dedupedLocationIds.length === 0) {
      await tx.userLocationAccess.deleteMany({
        where: { userId },
      });
    } else {
      await tx.userLocationAccess.deleteMany({
        where: {
          userId,
          locationId: { notIn: dedupedLocationIds },
        },
      });
    }

    await Promise.all(
      dedupedLocationIds.map((locationId) =>
        tx.userLocationAccess.upsert({
          where: {
            userId_locationId: {
              userId,
              locationId,
            },
          },
          update: {},
          create: {
            userId,
            locationId,
          },
        })
      )
    );
  });

  return prisma.userLocationAccess.findMany({
    where: { userId },
    include: { location: true },
    orderBy: { location: { name: "asc" } },
  });
}

export async function updateUserRoleProfile(
  userId: string,
  payload: {
    role?: Role;
    roleSubtypeId?: string | null;
    roleLabel?: string | null;
  }
) {
  if (payload.roleSubtypeId) {
    const subtype = await prisma.roleSubtype.findUnique({
      where: { id: payload.roleSubtypeId },
    });
    if (!subtype) {
      throw new Error("Role subtype not found");
    }
    if (payload.role && subtype.role !== payload.role) {
      throw new Error("Role subtype does not match selected role");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      role: payload.role,
      roleSubtypeId: payload.roleSubtypeId === undefined ? undefined : payload.roleSubtypeId,
      roleLabel: payload.roleLabel,
    },
    include: userContextInclude,
  });
}

/**
 * Walks the subtype hierarchy upward from the given user's rank, skipping levels
 * with no assigned user at the location, and returns the nearest supervisor.
 */
export async function resolveDirectReport(userId: string, locationId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleSubtype: true },
  });
  if (!user?.roleSubtype) return null;

  const currentRank = user.roleSubtype.rank;

  const candidates = await prisma.user.findMany({
    where: {
      isActive: true,
      locationAccess: { some: { locationId } },
      roleSubtype: { rank: { gt: currentRank } },
    },
    include: { roleSubtype: true },
    orderBy: { roleSubtype: { rank: "asc" } },
  });

  return candidates[0] ?? null;
}

/**
 * Returns the full reporting chain above a user at a location, ordered from
 * immediate supervisor to the top of the hierarchy.
 */
export async function resolveReportingChain(userId: string, locationId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleSubtype: true },
  });
  if (!user?.roleSubtype) return [];

  const currentRank = user.roleSubtype.rank;

  const chain = await prisma.user.findMany({
    where: {
      isActive: true,
      locationAccess: { some: { locationId } },
      roleSubtype: { rank: { gt: currentRank } },
    },
    include: { roleSubtype: true },
    orderBy: { roleSubtype: { rank: "asc" } },
  });

  return chain;
}

/**
 * Returns all active subtypes ordered by rank, useful for displaying the
 * organizational hierarchy.
 */
export async function getSubtypeHierarchy() {
  return prisma.roleSubtype.findMany({
    where: { isActive: true },
    orderBy: { rank: "desc" },
    select: {
      id: true,
      role: true,
      code: true,
      label: true,
      rank: true,
      parentSubtypeCode: true,
    },
  });
}
