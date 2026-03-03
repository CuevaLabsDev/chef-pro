import type { Role } from "@prisma/client";
import "next-auth";
import type { PermissionKey } from "@/modules/identity-access/rbac-config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      roleSubtypeId?: string | null;
      roleLabel?: string | null;
      locationIds: string[];
      permissionKeys: PermissionKey[];
    };
  }

  interface User {
    role: Role;
    roleSubtypeId?: string | null;
    roleLabel?: string | null;
    locationIds: string[];
    permissionKeys: PermissionKey[];
  }
}
