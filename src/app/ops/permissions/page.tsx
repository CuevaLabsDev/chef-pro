"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string | null;
}

interface RoleSubtype {
  id: string;
  role: "fte" | "ops" | "kitchen_admin" | "kitchen_admin_manager" | "chef" | "foh";
  code: string;
  label: string;
  permissionKeys: string[];
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: RoleSubtype["role"];
  roleSubtypeId: string | null;
  roleLabel: string | null;
  permissionKeys: string[];
  managedKitchenAdminIds?: string[];
  overrideRules?: { permissionKey: string; isAllowed: boolean }[];
}

type OverrideMode = "inherit" | "allow" | "deny";

const ROLE_LABELS: Record<UserRecord["role"], string> = {
  fte: "Full-time Employee",
  ops: "Operations",
  kitchen_admin: "Kitchen Admin",
  kitchen_admin_manager: "Kitchen Admin Manager",
  chef: "Chef Team",
  foh: "Front of House",
};

const PERMISSION_AREA_COPY: Record<string, { label: string; description: string; order: number }> =
  {
    tastings: {
      label: "Tasting sessions",
      description: "Control who can create, edit, submit, and view tasting work.",
      order: 1,
    },
    reviews: {
      label: "Review process",
      description: "Control who can review sessions and reopen locked work.",
      order: 2,
    },
    packets: {
      label: "Menu packets",
      description: "Control who can use, update, or adjust menu packet work.",
      order: 3,
    },
    kitchen_admins: {
      label: "Kitchen admin team",
      description: "Control who can manage kitchen admins and support their work view.",
      order: 4,
    },
    reports: {
      label: "Reports",
      description: "Control who can view reporting and export information.",
      order: 5,
    },
    notifications: {
      label: "Notifications",
      description: "Control who can view important team alerts.",
      order: 6,
    },
    config: {
      label: "Setup and schedule",
      description: "Control who can manage locations, periods, and deadlines.",
      order: 7,
    },
    permissions: {
      label: "Team access settings",
      description: "Control who can update team access in this page.",
      order: 8,
    },
    other: {
      label: "Other tasks",
      description: "Additional app tasks that do not fit another group yet.",
      order: 99,
    },
  };

const PERMISSION_COPY: Record<string, { label: string; description: string }> = {
  "tastings.create": {
    label: "Start new tasting sessions",
    description: "Create a new tasting session for the team.",
  },
  "tastings.edit": {
    label: "Edit draft tasting sessions",
    description: "Update tasting sessions before they are locked.",
  },
  "tastings.submit": {
    label: "Send sessions for review",
    description: "Submit completed tasting sessions for review.",
  },
  "tastings.view_all": {
    label: "View all tasting sessions",
    description: "View tastings from all chefs and teams.",
  },
  "config.manage": {
    label: "Manage locations and schedules",
    description: "Update locations, periods, deadlines, and setup details.",
  },
  "reviews.manage": {
    label: "Review submitted sessions",
    description: "Move tasting sessions through the review process.",
  },
  "reviews.unlock": {
    label: "Reopen locked sessions",
    description: "Unlock a session so updates can be made.",
  },
  "reports.view": {
    label: "View reports",
    description: "Open compliance and export reports.",
  },
  "notifications.view": {
    label: "View notifications",
    description: "See alerts and important updates.",
  },
  "packets.read": {
    label: "View menu packets",
    description: "Open menu signage and packet content.",
  },
  "packets.manage_structure": {
    label: "Update packet setup",
    description: "Create and edit packet items and details.",
  },
  "packets.execute": {
    label: "Update packet checklist",
    description: "Mark packet tasks complete and record backup usage.",
  },
  "packets.override": {
    label: "Adjust packet assignments",
    description: "Change packet status and assignments when needed.",
  },
  "packets.publish": {
    label: "Publish packets",
    description: "Send packets out so location teams can review them.",
  },
  "packets.finalize_service": {
    label: "Finalize packets for service",
    description: "Complete final packet sign-off before service starts.",
  },
  "kitchen_admins.manage": {
    label: "Manage kitchen admin team",
    description: "Choose which kitchen admins are supervised and where they can work.",
  },
  "kitchen_admins.view_as": {
    label: "Use kitchen admin support view",
    description: "Open a focused support view to help a kitchen admin complete packet work.",
  },
  "permissions.manage": {
    label: "Manage team access settings",
    description: "Update who can access each area of the app.",
  },
};

function getPermissionName(permission: Permission, fallbackIndex?: number): string {
  const copy = PERMISSION_COPY[permission.key];
  if (copy?.label) return copy.label;
  const friendlyName = permission.name?.trim();
  if (friendlyName) return friendlyName;
  if (typeof fallbackIndex === "number") {
    return `Access option ${fallbackIndex + 1}`;
  }
  return "Access option";
}

function getPermissionDescription(permission: Permission): string {
  const copy = PERMISSION_COPY[permission.key];
  if (copy?.description) return copy.description;
  const friendlyDescription = permission.description?.trim();
  if (friendlyDescription) return friendlyDescription;
  return "Choose whether someone can do this task in ChefPro.";
}

interface PermissionGroup {
  key: string;
  label: string;
  description: string;
  order: number;
  permissions: Permission[];
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [subtypes, setSubtypes] = useState<RoleSubtype[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSubtypeId, setSelectedSubtypeId] = useState("");
  const [selectedSubtypePermissions, setSelectedSubtypePermissions] = useState<
    Record<string, boolean>
  >({});
  const [savingSubtype, setSavingSubtype] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [userRole, setUserRole] = useState<UserRecord["role"]>("chef");
  const [userSubtypeId, setUserSubtypeId] = useState("");
  const [userLabel, setUserLabel] = useState("");
  const [managedKitchenAdminIds, setManagedKitchenAdminIds] = useState<string[]>([]);
  const [overrideModes, setOverrideModes] = useState<Record<string, OverrideMode>>({});
  const [savingUser, setSavingUser] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/identity/rbac");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load team access settings.");
      }

      setPermissions(payload.permissions ?? []);
      setSubtypes(payload.subtypes ?? []);
      setUsers(payload.users ?? []);

      const firstSubtype = payload.subtypes?.[0];
      if (firstSubtype?.id) {
        setSelectedSubtypeId(firstSubtype.id);
      }
      const firstUser = payload.users?.[0];
      if (firstUser?.id) {
        setSelectedUserId(firstUser.id);
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Could not load team access settings.";
      setError(message);
      toast.error("Could not load team access settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedSubtype = useMemo(
    () => subtypes.find((subtype) => subtype.id === selectedSubtypeId) ?? null,
    [subtypes, selectedSubtypeId]
  );

  useEffect(() => {
    if (!selectedSubtype) return;
    const defaults: Record<string, boolean> = {};
    for (const permission of permissions) {
      defaults[permission.key] = selectedSubtype.permissionKeys.includes(permission.key);
    }
    setSelectedSubtypePermissions(defaults);
  }, [selectedSubtype, permissions]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const filteredSubtypes = useMemo(
    () => subtypes.filter((subtype) => subtype.role === userRole),
    [subtypes, userRole]
  );

  const kitchenAdminOptions = useMemo(
    () =>
      users
        .filter((user) => user.role === "kitchen_admin")
        .map((user) => ({ id: user.id, label: `${user.name} (${user.email})` })),
    [users]
  );

  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    const grouped = new Map<string, PermissionGroup>();

    for (const permission of permissions) {
      const areaKey = permission.key.split(".")[0] ?? "other";
      const area = PERMISSION_AREA_COPY[areaKey] ?? PERMISSION_AREA_COPY.other;

      if (!grouped.has(areaKey)) {
        grouped.set(areaKey, {
          key: areaKey,
          label: area.label,
          description: area.description,
          order: area.order,
          permissions: [],
        });
      }

      grouped.get(areaKey)?.permissions.push(permission);
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        permissions: [...group.permissions].sort((a, b) =>
          getPermissionName(a).localeCompare(getPermissionName(b))
        ),
      }))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [permissions]);

  useEffect(() => {
    if (!selectedUser) return;
    setUserRole(selectedUser.role);
    setUserSubtypeId(selectedUser.roleSubtypeId ?? "");
    setUserLabel(selectedUser.roleLabel ?? "");
    setManagedKitchenAdminIds(selectedUser.managedKitchenAdminIds ?? []);

    const overrides: Record<string, OverrideMode> = {};
    for (const permission of permissions) {
      overrides[permission.key] = "inherit";
    }
    for (const override of selectedUser.overrideRules ?? []) {
      overrides[override.permissionKey] = override.isAllowed ? "allow" : "deny";
    }
    setOverrideModes(overrides);
  }, [selectedUser, permissions]);

  async function saveSubtypeDefaults() {
    if (!selectedSubtype) return;
    setSavingSubtype(true);
    setError("");

    try {
      const permissionKeys = permissions
        .filter((permission) => selectedSubtypePermissions[permission.key])
        .map((permission) => permission.key);

      const response = await fetch(`/api/identity/rbac/subtypes/${selectedSubtype.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKeys }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not save team default access.");
      }

      await loadData();
      toast.success("Team default access saved");
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Could not save team default access.";
      setError(message);
      toast.error("Could not save team default access");
    } finally {
      setSavingSubtype(false);
    }
  }

  async function saveUserOverrides() {
    if (!selectedUser) return;
    setSavingUser(true);
    setError("");

    try {
      const overrides = Object.entries(overrideModes)
        .filter(([, mode]) => mode !== "inherit")
        .map(([permissionKey, mode]) => ({
          permissionKey,
          isAllowed: mode === "allow",
        }));

      const response = await fetch(`/api/identity/rbac/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: userRole,
          roleSubtypeId: userSubtypeId || null,
          roleLabel: userLabel || null,
          managedKitchenAdminIds:
            userRole === "kitchen_admin_manager" ? managedKitchenAdminIds : [],
          overrides,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not save this person's access.");
      }

      await loadData();
      toast.success("Person's access saved");
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Could not save this person's access.";
      setError(message);
      toast.error("Could not save this person's access");
    } finally {
      setSavingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Access</h1>
        <p className="text-sm text-muted-foreground">
          Set default access for each team type, then adjust one person only when needed.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card className="gap-3">
        <CardTitle>How access works</CardTitle>
        <CardDescription>
          Follow this two-step flow so access stays consistent and easy to manage.
        </CardDescription>
        <ol className="space-y-2 text-sm text-foreground">
          <li>
            <span className="font-medium">Step 1:</span> Set default access for a team type.
          </li>
          <li>
            <span className="font-medium">Step 2:</span> Change one person only when they need
            different access.
          </li>
        </ol>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Default Access by Team Type</CardTitle>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a team type and set the standard access everyone in that team starts with.
            </p>
            <Select
              id="subtype-picker"
              label="Team type"
              value={selectedSubtypeId}
              onChange={(e) => setSelectedSubtypeId(e.target.value)}
              options={subtypes.map((subtype) => ({
                value: subtype.id,
                label: `${ROLE_LABELS[subtype.role]} - ${subtype.label}`,
              }))}
            />

            <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
              {permissionGroups.map((group) => (
                <section
                  key={`defaults-${group.key}`}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="space-y-2">
                    {group.permissions.map((permission, permissionIndex) => (
                      <label
                        key={permission.key}
                        className="flex items-start gap-3 p-2 rounded border border-border bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selectedSubtypePermissions[permission.key])}
                          onChange={(e) =>
                            setSelectedSubtypePermissions((prev) => ({
                              ...prev,
                              [permission.key]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {getPermissionName(permission, permissionIndex)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getPermissionDescription(permission)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
              {permissionGroups.length === 0 && (
                <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  No access options are available yet.
                </p>
              )}
            </div>

            <Button onClick={saveSubtypeDefaults} disabled={savingSubtype || !selectedSubtype}>
              {savingSubtype ? "Saving..." : "Save Team Default Access"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Custom Access for a Person</CardTitle>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick one person and adjust access only if they need something different from team
              defaults.
            </p>
            <Select
              id="user-picker"
              label="Team member"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={users.map((user) => ({
                value: user.id,
                label: `${user.name} (${user.email})`,
              }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                id="user-role"
                label="Team"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRecord["role"])}
                options={[
                  { value: "fte", label: ROLE_LABELS.fte },
                  { value: "ops", label: ROLE_LABELS.ops },
                  { value: "kitchen_admin", label: ROLE_LABELS.kitchen_admin },
                  { value: "kitchen_admin_manager", label: ROLE_LABELS.kitchen_admin_manager },
                  { value: "chef", label: ROLE_LABELS.chef },
                  { value: "foh", label: ROLE_LABELS.foh },
                ]}
              />
              <Select
                id="user-subtype"
                label="Team type"
                value={userSubtypeId}
                onChange={(e) => setUserSubtypeId(e.target.value)}
                options={filteredSubtypes.map((subtype) => ({
                  value: subtype.id,
                  label: subtype.label,
                }))}
                placeholder="No team type"
              />
              <Input
                id="user-label"
                label="Custom title"
                value={userLabel}
                onChange={(e) => setUserLabel(e.target.value)}
                placeholder="Optional role name shown to staff"
              />
            </div>

            {userRole === "kitchen_admin_manager" && (
              <section className="rounded-lg border border-border p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Kitchen admins this person supports
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ops chooses which kitchen admins this manager can support in focused view.
                  </p>
                </div>
                {kitchenAdminOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No kitchen admins are available yet.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {kitchenAdminOptions.map((kitchenAdmin) => (
                      <label
                        key={kitchenAdmin.id}
                        className="flex items-center gap-2 rounded border border-border bg-muted/50 px-2 py-1.5 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={managedKitchenAdminIds.includes(kitchenAdmin.id)}
                          onChange={(event) =>
                            setManagedKitchenAdminIds((prev) =>
                              event.target.checked
                                ? [...prev, kitchenAdmin.id]
                                : prev.filter((id) => id !== kitchenAdmin.id)
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>{kitchenAdmin.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
              {permissionGroups.map((group) => (
                <section
                  key={`person-${group.key}`}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="space-y-2">
                    {group.permissions.map((permission, permissionIndex) => (
                      <div
                        key={permission.key}
                        className="p-2 rounded border border-border bg-muted/50"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {getPermissionName(permission, permissionIndex)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {getPermissionDescription(permission)}
                        </p>
                        <Select
                          id={`override-${permission.key}`}
                          aria-label={`Access choice for ${getPermissionName(permission, permissionIndex)}`}
                          value={overrideModes[permission.key] ?? "inherit"}
                          onChange={(e) =>
                            setOverrideModes((prev) => ({
                              ...prev,
                              [permission.key]: e.target.value as OverrideMode,
                            }))
                          }
                          options={[
                            { value: "inherit", label: "Use Team Default" },
                            { value: "allow", label: "Give Access" },
                            { value: "deny", label: "Remove Access" },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {permissionGroups.length === 0 && (
                <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  No access options are available yet.
                </p>
              )}
            </div>

            <Button onClick={saveUserOverrides} disabled={savingUser || !selectedUser}>
              {savingUser ? "Saving..." : "Save Person's Access"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
