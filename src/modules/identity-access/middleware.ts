import { auth } from "@/lib/auth";
import {
  getUserContextById,
  hasAnyPermission,
  hasPermission,
} from "@/modules/identity-access/service";
import type { PermissionKey } from "@/modules/identity-access/rbac-config";
import type { EffectiveUserContext } from "@/modules/identity-access/types";
import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      user: null,
    };
  }

  const user = await getUserContextById(session.user.id);
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      user: null,
    };
  }

  return { error: null, session, user };
}

export async function requireRole(requiredRole: Role) {
  const { error, session, user } = await requireAuth();
  if (error || !user) return { error, session: null, user: null };

  if (user.role !== requiredRole) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
      user: null,
    };
  }

  return { error: null, session, user };
}

export async function requireAnyRole(requiredRoles: Role[]) {
  const { error, session, user } = await requireAuth();
  if (error || !user) return { error, session: null, user: null };

  if (!requiredRoles.includes(user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
      user: null,
    };
  }

  return { error: null, session, user };
}

export async function requirePermission(permissionKey: PermissionKey) {
  const { error, session, user } = await requireAuth();
  if (error || !user) return { error, session: null, user: null };

  if (!hasPermission(user, permissionKey)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
      user: null,
    };
  }

  return { error: null, session, user };
}

export async function requireAnyPermission(permissionKeys: PermissionKey[]) {
  const { error, session, user } = await requireAuth();
  if (error || !user) return { error, session: null, user: null };

  if (!hasAnyPermission(user, permissionKeys)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
      user: null,
    };
  }

  return { error: null, session, user };
}

export function getDefaultHomePath(user: EffectiveUserContext): string {
  if (user.role === "fte" || user.role === "ops" || user.role === "ops_admin")
    return "/ops/dashboard";
  if (user.role === "chef") return "/chef/dashboard";
  if (user.role === "kitchen_admin" || user.role === "kitchen_admin_manager" || user.role === "foh")
    return "/menu-signage";
  return "/chef/dashboard";
}
