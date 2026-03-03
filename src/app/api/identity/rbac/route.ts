import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  ensureDefaultRoleSubtypes,
  getPermissionCatalog,
  getRoleSubtypesWithDefaults,
  getUsersWithEffectivePermissions,
  hasPermission,
} from "@/modules/identity-access/service";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "permissions.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureDefaultRoleSubtypes();

  const [permissions, subtypes, users] = await Promise.all([
    getPermissionCatalog(),
    getRoleSubtypesWithDefaults(),
    getUsersWithEffectivePermissions(),
  ]);

  return NextResponse.json({ permissions, subtypes, users });
}
