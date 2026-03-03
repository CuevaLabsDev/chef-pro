import { NextRequest, NextResponse } from "next/server";
import { replaceSubtypePermissionsSchema } from "@/lib/validations";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  getRoleSubtypeById,
  hasPermission,
  replaceSubtypePermissionDefaults,
} from "@/modules/identity-access/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "permissions.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const subtype = await getRoleSubtypeById(id);
  if (!subtype) {
    return NextResponse.json({ error: "Role subtype not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = replaceSubtypePermissionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await replaceSubtypePermissionDefaults(id, parsed.data.permissionKeys);
  const updated = await getRoleSubtypeById(id);

  return NextResponse.json(updated);
}
