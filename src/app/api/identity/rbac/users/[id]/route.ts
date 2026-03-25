import { NextRequest, NextResponse } from "next/server";
import { updateUserPermissionsSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  clearManagedKitchenAdmins,
  getUserContextById,
  hasPermission,
  setManagedKitchenAdmins,
  setUserPermissionOverrides,
  updateUserRoleProfile,
} from "@/modules/identity-access/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "permissions.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateUserPermissionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, roleSubtypeId, roleLabel, managedKitchenAdminIds, overrides } = parsed.data;

  if (role !== undefined || roleSubtypeId !== undefined || roleLabel !== undefined) {
    await updateUserRoleProfile(id, {
      role,
      roleSubtypeId,
      roleLabel,
    });
  }

  if (overrides) {
    await setUserPermissionOverrides(id, overrides);
  }

  if (managedKitchenAdminIds) {
    const currentUser = await getUserContextById(id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = role ?? currentUser.role;
    if (targetRole === "kitchen_admin_manager") {
      await setManagedKitchenAdmins(id, managedKitchenAdminIds);
    } else {
      await clearManagedKitchenAdmins(id);
    }
  }

  const updated = await getUserContextById(id);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
