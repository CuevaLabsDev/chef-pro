import type { Role } from "@prisma/client";
import type { PermissionKey } from "./rbac-config";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleSubtypeId?: string | null;
  roleLabel?: string | null;
  locationIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleSubtypeId?: string | null;
  roleLabel?: string | null;
  locationIds: string[];
  permissionKeys: PermissionKey[];
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  roleSubtypeId?: string;
  roleLabel?: string;
  locationIds: string[];
}

export interface EffectiveUserContext {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleSubtypeId: string | null;
  roleLabel: string | null;
  locationIds: string[];
  permissionKeys: PermissionKey[];
}

export interface PermissionOverrideInput {
  permissionKey: PermissionKey;
  isAllowed: boolean;
}
