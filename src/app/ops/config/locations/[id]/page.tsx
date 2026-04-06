"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Landmark,
  MapPin,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationDetail {
  id: string;
  name: string;
  description: string | null;
  buildingId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  building: {
    id: string;
    name: string;
    campus: { id: string; name: string };
  } | null;
  userAccess: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      roleLabel: string | null;
      roleSubtype: { id: string; label: string; code: string } | null;
    };
  }[];
  _count: { tastingSessions: number; signagePackets: number };
}

interface Manager {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string | null;
  roleSubtype: { id: string; label: string; code: string } | null;
  isActive: boolean;
  assignedAt: string;
}

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleSubtype: { id: string; label: string } | null;
}

interface RoleSubtype {
  id: string;
  role: string;
  code: string;
  label: string;
}

const ROLE_LABELS: Record<string, string> = {
  fte: "FTE",
  ops: "Ops",
  kitchen_admin: "Kitchen Admin",
  kitchen_admin_manager: "Kitchen Admin Manager",
  chef: "Chef",
  foh: "FOH",
};

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [roleSubtypes, setRoleSubtypes] = useState<RoleSubtype[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit location state
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Add manager dialog
  const [addingManager, setAddingManager] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Edit manager role dialog
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editSubtypeId, setEditSubtypeId] = useState("");
  const [editRoleLabel, setEditRoleLabel] = useState("");

  // Remove manager dialog
  const [removingManager, setRemovingManager] = useState<Manager | null>(null);

  const loadLocation = useCallback(async () => {
    const res = await fetch(`/api/config/locations/${id}`);
    if (!res.ok) {
      router.replace("/ops/config/locations");
      return;
    }
    const data = await res.json();
    setLocation(data);
    setEditName(data.name);
    setEditDescription(data.description ?? "");
  }, [id, router]);

  const loadManagers = useCallback(async () => {
    const res = await fetch(`/api/config/locations/${id}/managers`);
    if (!res.ok) return;
    const data = await res.json();
    setManagers(data.managers ?? []);
    setAssignableUsers(data.assignable ?? []);
  }, [id]);

  const loadSubtypes = useCallback(async () => {
    try {
      const res = await fetch("/api/identity/rbac");
      if (!res.ok) return;
      const data = await res.json();
      setRoleSubtypes(
        (data.subtypes ?? []).map(
          (s: { id: string; role: string; code: string; label: string }) => ({
            id: s.id,
            role: s.role,
            code: s.code,
            label: s.label,
          })
        )
      );
    } catch {
      // User may not have permissions.manage, subtypes are optional
    }
  }, []);

  useEffect(() => {
    Promise.all([loadLocation(), loadManagers(), loadSubtypes()]).finally(() => setLoading(false));
  }, [loadLocation, loadManagers, loadSubtypes]);

  async function handleUpdateLocation() {
    setSaving(true);
    try {
      const res = await fetch(`/api/config/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });
      if (res.ok) {
        await loadLocation();
        setEditingInfo(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignManager() {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/locations/${id}/managers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setManagers(data.managers ?? []);
        await loadManagers();
        setAddingManager(false);
        setSelectedUserId("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateManagerRole() {
    if (!editingManager) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/locations/${id}/managers/${editingManager.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole || undefined,
          roleSubtypeId: editSubtypeId || null,
          roleLabel: editRoleLabel.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setManagers(data.managers ?? []);
        setEditingManager(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveManager() {
    if (!removingManager) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/locations/${id}/managers/${removingManager.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setManagers(data.managers ?? []);
        await loadManagers();
        setRemovingManager(null);
      }
    } finally {
      setSaving(false);
    }
  }

  function openEditManager(manager: Manager) {
    setEditingManager(manager);
    setEditRole(manager.role);
    setEditSubtypeId(manager.roleSubtype?.id ?? "");
    setEditRoleLabel(manager.roleLabel ?? "");
  }

  const subtypesForRole = roleSubtypes.filter((s) => s.role === editRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!location) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/ops/config/locations")}>
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {location.building?.campus && (
          <>
            <Landmark className="size-3.5" />
            <span>{location.building.campus.name}</span>
            <span>/</span>
          </>
        )}
        {location.building && (
          <>
            <Building2 className="size-3.5" />
            <span>{location.building.name}</span>
            <span>/</span>
          </>
        )}
        <MapPin className="size-3.5" />
        <span className="text-foreground font-medium">{location.name}</span>
      </div>

      {/* Location Info Card */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{location.name}</h1>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  location.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {location.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {location.description && (
              <p className="text-sm text-muted-foreground">{location.description}</p>
            )}
            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
              <span>
                {managers.length} manager{managers.length !== 1 ? "s" : ""} assigned
              </span>
              <span>{location._count.tastingSessions} tasting sessions</span>
              <span>{location._count.signagePackets} signage packets</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditingInfo(true)}>
            <Pencil className="size-3.5 mr-1" />
            Edit
          </Button>
        </div>
      </Card>

      {/* Managers Section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <CardTitle className="text-lg">Assigned Managers</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setAddingManager(true);
              setSelectedUserId("");
            }}
          >
            <UserPlus className="size-4 mr-1" />
            Add Manager
          </Button>
        </div>

        {managers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="size-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No managers assigned to this location yet.</p>
            <p className="text-xs mt-1">Add managers to give them access to this cafe/concept.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="font-medium">{manager.name}</TableCell>
                  <TableCell className="text-muted-foreground">{manager.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[manager.role] ?? manager.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {manager.roleSubtype?.label ?? (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {manager.roleLabel ?? <span className="text-muted-foreground">--</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditManager(manager)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit role"
                      >
                        <Shield className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setRemovingManager(manager)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove from location"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit Location Dialog */}
      <Dialog open={editingInfo} onOpenChange={setEditingInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cafe/Concept</DialogTitle>
            <DialogDescription>Update location details.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateLocation();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="loc-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                id="loc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="loc-desc" className="text-sm font-medium text-foreground">
                Description
              </label>
              <Input
                id="loc-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1"
                placeholder="Optional description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingInfo(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !editName.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Manager Dialog */}
      <Dialog open={addingManager} onOpenChange={setAddingManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manager</DialogTitle>
            <DialogDescription>
              Assign a user to <strong>{location.name}</strong>. They will gain access to this
              location.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAssignManager();
            }}
            className="space-y-4"
          >
            {assignableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All active users are already assigned to this location.
              </p>
            ) : (
              <Select
                id="assign-user"
                label="Select User"
                placeholder="Choose a user..."
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                options={assignableUsers.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.email}) - ${ROLE_LABELS[u.role] ?? u.role}`,
                }))}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddingManager(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !selectedUserId || assignableUsers.length === 0}
              >
                {saving ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Manager Role Dialog */}
      <Dialog
        open={!!editingManager}
        onOpenChange={(open) => {
          if (!open) setEditingManager(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role &amp; Permissions</DialogTitle>
            <DialogDescription>
              Update <strong>{editingManager?.name}</strong>&apos;s role and subtype. This affects
              their permissions across all assigned locations.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateManagerRole();
            }}
            className="space-y-4"
          >
            <Select
              id="mgr-role"
              label="Role"
              value={editRole}
              onChange={(e) => {
                setEditRole(e.target.value);
                setEditSubtypeId("");
              }}
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            {subtypesForRole.length > 0 && (
              <Select
                id="mgr-subtype"
                label="Subtype"
                placeholder="Select a subtype..."
                value={editSubtypeId}
                onChange={(e) => setEditSubtypeId(e.target.value)}
                options={subtypesForRole.map((s) => ({ value: s.id, label: s.label }))}
              />
            )}
            <div>
              <label htmlFor="mgr-label" className="text-sm font-medium text-foreground">
                Custom Label
              </label>
              <Input
                id="mgr-label"
                value={editRoleLabel}
                onChange={(e) => setEditRoleLabel(e.target.value)}
                className="mt-1"
                placeholder="e.g. Head Chef, Lead FOH..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingManager(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Manager Confirmation */}
      <Dialog
        open={!!removingManager}
        onOpenChange={(open) => {
          if (!open) setRemovingManager(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Manager</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removingManager?.name}</strong> from{" "}
              <strong>{location.name}</strong>? They will lose access to this location.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingManager(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemoveManager} disabled={saving}>
              {saving ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
