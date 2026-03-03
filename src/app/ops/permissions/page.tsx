"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string | null;
}

interface RoleSubtype {
  id: string;
  role: "fte" | "ops" | "ops_admin" | "kitchen_admin" | "chef" | "foh";
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
  overrideRules?: { permissionKey: string; isAllowed: boolean }[];
}

type OverrideMode = "inherit" | "allow" | "deny";

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
  const [overrideModes, setOverrideModes] = useState<Record<string, OverrideMode>>({});
  const [savingUser, setSavingUser] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/identity/rbac");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load RBAC data");
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
      setError(err instanceof Error ? err.message : "Failed to load RBAC data");
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
    () =>
      subtypes.filter(
        (subtype) =>
          subtype.role === userRole || (userRole === "ops_admin" && subtype.role === "ops")
      ),
    [subtypes, userRole]
  );

  useEffect(() => {
    if (!selectedUser) return;
    setUserRole(selectedUser.role);
    setUserSubtypeId(selectedUser.roleSubtypeId ?? "");
    setUserLabel(selectedUser.roleLabel ?? "");

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
        throw new Error(body.error ?? "Failed to update subtype defaults");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subtype defaults");
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
          role: userRole === "ops_admin" ? "ops" : userRole,
          roleSubtypeId: userSubtypeId || null,
          roleLabel: userLabel || null,
          overrides,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update user permissions");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user permissions");
    } finally {
      setSavingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Permissions Management</h1>
        <p className="text-sm text-gray-500">Configure subtype defaults and per-user overrides.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Subtype Default Permissions</CardTitle>
          <div className="mt-4 space-y-4">
            <Select
              id="subtype-picker"
              label="Subtype"
              value={selectedSubtypeId}
              onChange={(e) => setSelectedSubtypeId(e.target.value)}
              options={subtypes.map((subtype) => ({
                value: subtype.id,
                label: `${subtype.role} · ${subtype.label}`,
              }))}
            />

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {permissions.map((permission) => (
                <label
                  key={permission.key}
                  className="flex items-start gap-3 p-2 rounded border border-gray-200 bg-gray-50"
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
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{permission.name}</p>
                    <p className="text-xs text-gray-500">{permission.key}</p>
                  </div>
                </label>
              ))}
            </div>

            <Button onClick={saveSubtypeDefaults} disabled={savingSubtype || !selectedSubtype}>
              {savingSubtype ? "Saving..." : "Save Subtype Defaults"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>User Overrides</CardTitle>
          <div className="mt-4 space-y-4">
            <Select
              id="user-picker"
              label="User"
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
                label="Role"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRecord["role"])}
                options={[
                  { value: "fte", label: "FTE" },
                  { value: "ops", label: "OPS" },
                  { value: "ops_admin", label: "Ops Admin (legacy)" },
                  { value: "kitchen_admin", label: "Kitchen Admin" },
                  { value: "chef", label: "Chef" },
                  { value: "foh", label: "FOH" },
                ]}
              />
              <Select
                id="user-subtype"
                label="Subtype"
                value={userSubtypeId}
                onChange={(e) => setUserSubtypeId(e.target.value)}
                options={filteredSubtypes.map((subtype) => ({
                  value: subtype.id,
                  label: subtype.label,
                }))}
                placeholder="None"
              />
              <Input
                id="user-label"
                label="Label"
                value={userLabel}
                onChange={(e) => setUserLabel(e.target.value)}
                placeholder="Optional display label"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {permissions.map((permission) => (
                <div key={permission.key} className="p-2 rounded border border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">{permission.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{permission.key}</p>
                  <Select
                    id={`override-${permission.key}`}
                    value={overrideModes[permission.key] ?? "inherit"}
                    onChange={(e) =>
                      setOverrideModes((prev) => ({
                        ...prev,
                        [permission.key]: e.target.value as OverrideMode,
                      }))
                    }
                    options={[
                      { value: "inherit", label: "Inherit subtype default" },
                      { value: "allow", label: "Allow" },
                      { value: "deny", label: "Deny" },
                    ]}
                  />
                </div>
              ))}
            </div>

            <Button onClick={saveUserOverrides} disabled={savingUser || !selectedUser}>
              {savingUser ? "Saving..." : "Save User Overrides"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
