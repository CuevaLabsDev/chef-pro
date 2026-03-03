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
  kitchen_admin: ["packets.read", "packets.manage_structure"],
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
  ops_admin: [
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
    overrideRules: user.permissionRules.map((rule) => ({
      permissionKey: rule.permission.key,
      isAllowed: rule.isAllowed,
    })),
  }));
}

export async function getOpsAndFteUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["ops", "ops_admin", "fte"] }, isActive: true },
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
        isActive: true,
      },
      create: {
        role: subtype.role,
        code: subtype.code,
        label: subtype.label,
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
    orderBy: [{ role: "asc" }, { label: "asc" }],
  });

  return subtypes.map((subtype) => ({
    id: subtype.id,
    role: subtype.role,
    code: subtype.code,
    label: subtype.label,
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
