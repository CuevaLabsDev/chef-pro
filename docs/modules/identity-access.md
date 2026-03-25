# Module: identity-access

**Path:** `src/modules/identity-access/`
**Purpose:** User management, authentication middleware, and role-based access control (RBAC).

## Files

| File             | Role                                                      |
| ---------------- | --------------------------------------------------------- |
| `service.ts`     | User CRUD, permission resolution, RBAC management         |
| `types.ts`       | User, SessionUser, EffectiveUserContext, permission types |
| `middleware.ts`  | Route-level auth guards (requireAuth, requirePermission)  |
| `rbac-config.ts` | Permission catalog, subtype definitions, permission keys  |

## Dependencies

- `@/lib/db` (Prisma)
- `@/lib/auth` (NextAuth `auth()` function, used in middleware)
- `bcryptjs` (password hashing in createUser)

## Key Types

- **`EffectiveUserContext`** -- The resolved user with computed `permissionKeys[]`. This is what route handlers receive from `requireAuth()`.
- **`SessionUser`** -- Subset stored in the JWT: id, email, name, role, roleSubtypeId, roleLabel, locationIds, permissionKeys.
- **`PermissionKey`** -- Union type of all 18 permission key strings, derived from `PERMISSION_CATALOG`.

## Service Exports

### Permission Checking

| Function           | Signature                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `hasPermission`    | `(user: EffectiveUserContext, key: PermissionKey) => boolean`    |
| `hasAnyPermission` | `(user: EffectiveUserContext, keys: PermissionKey[]) => boolean` |

### User CRUD

| Function                             | Returns                                     |
| ------------------------------------ | ------------------------------------------- |
| `createUser(input)`                  | `UserWithContext`                           |
| `getUserById(id)`                    | `UserWithContext \| null`                   |
| `getUserContextById(id)`             | `EffectiveUserContext \| null`              |
| `getAllUsers()`                      | `UserWithContext[]`                         |
| `getUsersByRole(role)`               | `UserWithContext[]`                         |
| `getUsersWithEffectivePermissions()` | Users with computed permissions + overrides |
| `getOpsAndFteUsers()`                | `User[]` (ops, ops_admin, fte roles)        |

### RBAC Management

| Function                                                             | Purpose                                          |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| `ensurePermissionCatalog()`                                          | Upserts all permissions from PERMISSION_CATALOG  |
| `ensureDefaultRoleSubtypes()`                                        | Seeds default subtypes and their permissions     |
| `getPermissionCatalog()`                                             | All permissions ordered by key                   |
| `getRoleSubtypesWithDefaults()`                                      | Active subtypes with resolved permission keys    |
| `getRoleSubtypeById(id)`                                             | Single subtype with permissions                  |
| `replaceSubtypePermissionDefaults(id, keys)`                         | Replace all defaults for a subtype               |
| `setUserPermissionOverrides(userId, overrides)`                      | Set per-user grants/revokes                      |
| `updateUserRoleProfile(userId, payload)`                             | Update role, subtype, label                      |
| `setManagedKitchenAdmins(managerId, kitchenAdminIds)`                | Set manager -> kitchen admin assignments         |
| `getManagedKitchenAdminSummaries(managerId)`                         | Get managed kitchen admins with location context |
| `getManagedKitchenAdminContextForManager(managerId, kitchenAdminId)` | Resolve view-as scope safely                     |

### Location Access

| Function                                         | Purpose                             |
| ------------------------------------------------ | ----------------------------------- |
| `getLocationManagers(locationId)`                | Users assigned to a location        |
| `getAssignableUsers(locationId)`                 | Users not yet assigned              |
| `assignUserToLocation(userId, locationId)`       | Create access record                |
| `removeUserFromLocation(userId, locationId)`     | Delete access record                |
| `replaceUserLocationAccess(userId, locationIds)` | Replace a user's assigned locations |

## Middleware Exports

| Function                     | Guard                            | Returns                        |
| ---------------------------- | -------------------------------- | ------------------------------ |
| `requireAuth()`              | Must be logged in                | `{error, session, user}`       |
| `requireRole(role)`          | Must have exact role             | `{error, session, user}`       |
| `requireAnyRole(roles)`      | Must have one of the roles       | `{error, session, user}`       |
| `requirePermission(key)`     | Must have specific permission    | `{error, session, user}`       |
| `requireAnyPermission(keys)` | Must have one of the permissions | `{error, session, user}`       |
| `getDefaultHomePath(user)`   | N/A                              | Role-appropriate redirect path |

## RBAC Config

**`PERMISSION_CATALOG`**: Array of 18 permission objects with `key`, `name`, `description`.

**`DEFAULT_SUBTYPE_DEFINITIONS`**: Array of 10 subtype objects with `role`, `code`, `label`, `permissionKeys[]`.

**`ALL_PERMISSION_KEYS`**: Flat array of all permission key strings.

See `domain-model.md` for the full permission key list and 3-layer resolution logic.

## API Routes That Consume This Module

| Route                                                        | Methods       | Purpose                                        |
| ------------------------------------------------------------ | ------------- | ---------------------------------------------- |
| `/api/identity/rbac`                                         | GET           | Full RBAC overview                             |
| `/api/identity/rbac/users/[id]`                              | PATCH         | Update user role + permission overrides        |
| `/api/identity/rbac/subtypes/[id]`                           | PATCH         | Replace subtype default permissions            |
| `/api/config/locations/[id]/managers`                        | GET, POST     | Location manager assignment                    |
| `/api/config/locations/[id]/managers/[userId]`               | PATCH, DELETE | Manager role update, removal                   |
| `/api/kitchen-admin-manager/team`                            | GET           | Kitchen admin manager support/overview payload |
| `/api/kitchen-admin-manager/team/[kitchenAdminId]/locations` | PATCH         | Kitchen admin manager location assignment      |

## Side Effects

- No domain events published directly (auth/RBAC changes are immediate).
- Audit events should be created by the API routes that call these service functions.
