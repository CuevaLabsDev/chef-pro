"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  Plus,
  Landmark,
  Pencil,
  Power,
  RotateCcw,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Building {
  id: string;
  name: string;
  isActive: boolean;
  locations: Location[];
}

interface Campus {
  id: string;
  name: string;
  isActive: boolean;
  buildings: Building[];
}

type AddingState =
  | { type: "campus" }
  | { type: "building"; campusId: string }
  | { type: "location"; buildingId: string }
  | null;

type EditingState =
  | { type: "campus"; id: string; name: string }
  | { type: "building"; id: string; name: string }
  | { type: "location"; id: string; name: string; description: string }
  | null;

export default function CafeConceptPage() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const campusesApiUrl = showInactive
    ? "/api/config/campuses?includeInactive=true"
    : "/api/config/campuses";
  const {
    data: campusData,
    isLoading: loading,
    mutate: refreshCampuses,
  } = useApi<Campus[]>(campusesApiUrl);
  const campuses = campusData ?? [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<AddingState>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deactivating, setDeactivating] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [reactivating, setReactivating] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [deleteNameInput, setDeleteNameInput] = useState("");

  useEffect(() => {
    if (campusData && campusData.length > 0) {
      setExpanded((prev) => {
        const exp: Record<string, boolean> = {};
        for (const c of campusData) {
          exp[c.id] = true;
          for (const b of c.buildings) {
            exp[b.id] = true;
          }
        }
        return { ...exp, ...prev };
      });
    }
  }, [campusData]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAdd() {
    if (!adding || !newName.trim()) return;
    setSaving(true);

    try {
      let res: Response | undefined;

      if (adding.type === "campus") {
        res = await fetch("/api/config/campuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
      } else if (adding.type === "building") {
        res = await fetch("/api/config/buildings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), campusId: adding.campusId }),
        });
      } else if (adding.type === "location") {
        res = await fetch("/api/config/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), buildingId: adding.buildingId }),
        });
      }

      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Failed to create");
        return;
      }

      toast.success(`${adding.type.charAt(0).toUpperCase() + adding.type.slice(1)} added`);
      setNewName("");
      setAdding(null);
    } finally {
      setSaving(false);
      refreshCampuses();
    }
  }

  async function handleEdit() {
    if (!editing) return;
    setSaving(true);

    try {
      let res: Response | undefined;

      if (editing.type === "campus") {
        res = await fetch(`/api/config/campuses/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        });
      } else if (editing.type === "building") {
        res = await fetch(`/api/config/buildings/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        });
      } else if (editing.type === "location") {
        res = await fetch(`/api/config/locations/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            description: editDescription.trim() || null,
          }),
        });
      }

      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Failed to save");
        return;
      }

      toast.success("Saved");
      setEditing(null);
    } finally {
      setSaving(false);
      refreshCampuses();
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setSaving(true);

    try {
      const urlMap: Record<string, string> = {
        campus: `/api/config/campuses/${deactivating.id}`,
        building: `/api/config/buildings/${deactivating.id}`,
        location: `/api/config/locations/${deactivating.id}`,
      };
      const url = urlMap[deactivating.type];
      if (!url) return;

      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Failed to deactivate");
        return;
      }

      toast.success(`${deactivating.name} deactivated`);
      setDeactivating(null);
    } finally {
      setSaving(false);
      refreshCampuses();
    }
  }

  async function handleReactivate() {
    if (!reactivating) return;
    setSaving(true);

    try {
      const urlMap: Record<string, string> = {
        campus: `/api/config/campuses/${reactivating.id}`,
        building: `/api/config/buildings/${reactivating.id}`,
        location: `/api/config/locations/${reactivating.id}`,
      };
      const url = urlMap[reactivating.type];
      if (!url) return;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Failed to reactivate");
        return;
      }

      toast.success(`${reactivating.name} reactivated`);
      setReactivating(null);
    } finally {
      setSaving(false);
      refreshCampuses();
    }
  }

  async function handlePermanentDelete() {
    if (!permanentDeleting) return;
    if (deleteNameInput !== permanentDeleting.name) {
      toast.error("Type the exact name to confirm.");
      return;
    }

    setSaving(true);

    try {
      const urlMap: Record<string, string> = {
        campus: `/api/config/campuses/${permanentDeleting.id}?permanent=true`,
        building: `/api/config/buildings/${permanentDeleting.id}?permanent=true`,
        location: `/api/config/locations/${permanentDeleting.id}?permanent=true`,
      };
      const url = urlMap[permanentDeleting.type];
      if (!url) return;

      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          body.error ?? "We couldn't delete this item. Keep it inactive to preserve records."
        );
        return;
      }

      toast.success(`${permanentDeleting.name} was deleted permanently.`);
      setPermanentDeleting(null);
      setDeleteNameInput("");
    } finally {
      setSaving(false);
      refreshCampuses();
    }
  }

  function openPermanentDelete(type: "campus" | "building" | "location", id: string, name: string) {
    setPermanentDeleting({ type, id, name });
    setDeleteNameInput("");
  }

  function getEntityLabel(type?: string) {
    if (type === "campus") return "campus";
    if (type === "building") return "building";
    return "cafe";
  }

  function startEditing(type: "campus" | "building", id: string, name: string): void;
  function startEditing(type: "location", id: string, name: string, description?: string): void;
  function startEditing(type: string, id: string, name: string, description?: string) {
    if (type === "location") {
      setEditing({ type: "location", id, name, description: description ?? "" });
    } else {
      setEditing({ type: type as "campus" | "building", id, name });
    }
    setEditName(name);
    setEditDescription(description ?? "");
  }

  const filteredCampuses = campuses
    .map((campus) => {
      if (!searchQuery.trim()) return campus;
      const q = searchQuery.toLowerCase();
      const filteredBuildings = campus.buildings
        .map((b) => ({
          ...b,
          locations: b.locations.filter(
            (l) => l.name.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
          ),
        }))
        .filter((b) => b.name.toLowerCase().includes(q) || b.locations.length > 0);
      if (campus.name.toLowerCase().includes(q) || filteredBuildings.length > 0) {
        return { ...campus, buildings: filteredBuildings };
      }
      return null;
    })
    .filter(Boolean) as Campus[];

  const isDeleteNameMatch = permanentDeleting ? deleteNameInput === permanentDeleting.name : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cafe / Concept</h1>
          <p className="text-sm text-muted-foreground">
            Manage your location hierarchy: Campus &gt; Building &gt; Cafe/Concept
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? "secondary" : "outline"}
            onClick={() => setShowInactive((prev) => !prev)}
          >
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Button
            onClick={() => {
              setAdding({ type: "campus" });
              setNewName("");
            }}
          >
            <Plus className="size-4 mr-1" /> Add Campus
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search campuses, buildings, or cafes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {adding?.type === "campus" && (
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="flex items-center gap-3"
          >
            <Landmark className="size-5 text-primary shrink-0" />
            <Input
              id="new-campus"
              placeholder="Campus name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={saving || !newName.trim()}>
              {saving ? "Adding..." : "Add"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(null)}>
              Cancel
            </Button>
          </form>
        </Card>
      )}

      {filteredCampuses.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground py-4 text-center">
            {searchQuery
              ? "No results match your search."
              : "No campuses configured yet. Add one to get started."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCampuses.map((campus) => (
            <Card key={campus.id} className="p-0 overflow-hidden">
              <div className="flex items-center w-full hover:bg-muted/50 transition-colors">
                <button
                  onClick={() => toggle(campus.id)}
                  className="flex items-center gap-3 flex-1 px-4 py-3 text-left"
                >
                  {expanded[campus.id] ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <Landmark className="size-5 text-primary" />
                  <span className="font-semibold text-foreground">{campus.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      campus.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {campus.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {campus.buildings.reduce((sum, b) => sum + b.locations.length, 0)} cafes
                  </Badge>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing("campus", campus.id, campus.name);
                  }}
                  className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit campus"
                >
                  <Pencil className="size-3.5" />
                </button>
                {campus.isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeactivating({ type: "campus", id: campus.id, name: campus.name });
                    }}
                    className="p-2 mr-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Deactivate campus"
                  >
                    <Power className="size-3.5" />
                  </button>
                ) : (
                  <div className="mr-2 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReactivating({ type: "campus", id: campus.id, name: campus.name });
                      }}
                      className="p-2 rounded-md hover:bg-emerald-100 text-muted-foreground hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400 transition-colors"
                      title="Reactivate campus"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPermanentDelete("campus", campus.id, campus.name);
                      }}
                      className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete campus permanently"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {expanded[campus.id] && (
                <div className="border-t border-border">
                  {campus.buildings.map((building) => (
                    <div key={building.id}>
                      <div className="flex items-center w-full hover:bg-muted/50 transition-colors">
                        <button
                          onClick={() => toggle(building.id)}
                          className="flex items-center gap-3 flex-1 pl-10 pr-4 py-2.5 text-left"
                        >
                          {expanded[building.id] ? (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          )}
                          <Building2 className="size-4 text-muted-foreground" />
                          <span className="font-medium text-foreground text-sm">
                            {building.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              building.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {building.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {building.locations.length} cafe{building.locations.length !== 1 && "s"}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing("building", building.id, building.name);
                          }}
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit building"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {building.isActive ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeactivating({
                                type: "building",
                                id: building.id,
                                name: building.name,
                              });
                            }}
                            className="p-2 mr-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Deactivate building"
                          >
                            <Power className="size-3.5" />
                          </button>
                        ) : (
                          <div className="mr-2 flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReactivating({
                                  type: "building",
                                  id: building.id,
                                  name: building.name,
                                });
                              }}
                              className="p-2 rounded-md hover:bg-emerald-100 text-muted-foreground hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400 transition-colors"
                              title="Reactivate building"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPermanentDelete("building", building.id, building.name);
                              }}
                              className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete building permanently"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {expanded[building.id] && (
                        <div className="border-t border-border/50">
                          {building.locations.map((location) => (
                            <div
                              key={location.id}
                              className="flex items-center gap-3 pl-20 pr-4 py-2 hover:bg-muted/30 transition-colors group"
                            >
                              <MapPin className="size-3.5 text-muted-foreground" />
                              <button
                                onClick={() => router.push(`/ops/config/locations/${location.id}`)}
                                className="text-sm text-foreground hover:text-primary hover:underline text-left"
                              >
                                {location.name}
                              </button>
                              {location.description && (
                                <span className="text-xs text-muted-foreground">
                                  {location.description}
                                </span>
                              )}
                              <div className="ml-auto flex items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    location.isActive
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {location.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      startEditing(
                                        "location",
                                        location.id,
                                        location.name,
                                        location.description
                                      )
                                    }
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit cafe"
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      router.push(`/ops/config/locations/${location.id}`)
                                    }
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Manage cafe"
                                  >
                                    <Users className="size-3" />
                                  </button>
                                  {location.isActive ? (
                                    <button
                                      onClick={() =>
                                        setDeactivating({
                                          type: "location",
                                          id: location.id,
                                          name: location.name,
                                        })
                                      }
                                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                      title="Deactivate cafe"
                                    >
                                      <Power className="size-3" />
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() =>
                                          setReactivating({
                                            type: "location",
                                            id: location.id,
                                            name: location.name,
                                          })
                                        }
                                        className="p-1.5 rounded-md hover:bg-emerald-100 text-muted-foreground hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400 transition-colors"
                                        title="Reactivate cafe"
                                      >
                                        <RotateCcw className="size-3" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          openPermanentDelete(
                                            "location",
                                            location.id,
                                            location.name
                                          )
                                        }
                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        title="Delete cafe permanently"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {building.isActive ? (
                            adding?.type === "location" && adding.buildingId === building.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAdd();
                                }}
                                className="flex items-center gap-2 pl-20 pr-4 py-2"
                              >
                                <MapPin className="size-3.5 text-primary shrink-0" />
                                <Input
                                  id={`new-loc-${building.id}`}
                                  placeholder="Cafe/Concept name"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  autoFocus
                                  className="flex-1 h-8 text-sm"
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={saving || !newName.trim()}
                                >
                                  Add
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAdding(null)}
                                >
                                  Cancel
                                </Button>
                              </form>
                            ) : (
                              <button
                                onClick={() => {
                                  setAdding({ type: "location", buildingId: building.id });
                                  setNewName("");
                                }}
                                className="flex items-center gap-2 pl-20 pr-4 py-2 text-sm text-primary hover:bg-muted/30 w-full text-left transition-colors"
                              >
                                <Plus className="size-3.5" />
                                Add Cafe/Concept
                              </button>
                            )
                          ) : (
                            <div className="pl-20 pr-4 py-2 text-xs text-muted-foreground border-t border-border/50">
                              Reactivate this building to add cafes/concepts.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {campus.isActive ? (
                    adding?.type === "building" && adding.campusId === campus.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAdd();
                        }}
                        className="flex items-center gap-2 pl-10 pr-4 py-2 border-t border-border"
                      >
                        <Building2 className="size-4 text-primary shrink-0" />
                        <Input
                          id={`new-bldg-${campus.id}`}
                          placeholder="Building name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          autoFocus
                          className="flex-1 h-8 text-sm"
                        />
                        <Button type="submit" size="sm" disabled={saving || !newName.trim()}>
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdding(null)}
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setAdding({ type: "building", campusId: campus.id });
                          setNewName("");
                        }}
                        className="flex items-center gap-2 pl-10 pr-4 py-2.5 text-sm text-primary hover:bg-muted/30 w-full text-left border-t border-border transition-colors"
                      >
                        <Plus className="size-3.5" />
                        Add Building
                      </button>
                    )
                  ) : (
                    <div className="pl-10 pr-4 py-2.5 text-xs text-muted-foreground border-t border-border">
                      Reactivate this campus to add buildings.
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit{" "}
              {editing?.type === "campus"
                ? "Campus"
                : editing?.type === "building"
                  ? "Building"
                  : "Cafe/Concept"}
            </DialogTitle>
            <DialogDescription>
              Update the name{editing?.type === "location" ? " and description" : ""}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEdit();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="edit-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            {editing?.type === "location" && (
              <div>
                <label htmlFor="edit-desc" className="text-sm font-medium text-foreground">
                  Description
                </label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Optional description"
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !editName.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog
        open={!!deactivating}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Deactivate{" "}
              {deactivating?.type === "campus"
                ? "Campus"
                : deactivating?.type === "building"
                  ? "Building"
                  : "Cafe/Concept"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{deactivating?.name}</strong>? This will
              hide it from active lists but preserve its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivating(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeactivate} disabled={saving}>
              {saving ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Confirmation */}
      <Dialog
        open={!!reactivating}
        onOpenChange={(open) => {
          if (!open) setReactivating(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reactivate{" "}
              {reactivating?.type === "campus"
                ? "Campus"
                : reactivating?.type === "building"
                  ? "Building"
                  : "Cafe/Concept"}
            </DialogTitle>
            <DialogDescription>
              Reactivate <strong>{reactivating?.name}</strong> and restore it to active lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivating(null)}>
              Cancel
            </Button>
            <Button onClick={handleReactivate} disabled={saving}>
              {saving ? "Reactivating..." : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation */}
      <Dialog
        open={!!permanentDeleting}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentDeleting(null);
            setDeleteNameInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {getEntityLabel(permanentDeleting?.type)} permanently</DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong>{permanentDeleting?.name}</strong>. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Type the exact name to confirm.</p>
            <Input
              value={deleteNameInput}
              onChange={(event) => setDeleteNameInput(event.target.value)}
              placeholder={permanentDeleting?.name ?? ""}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPermanentDeleting(null);
                setDeleteNameInput("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handlePermanentDelete}
              disabled={saving || !isDeleteNameMatch}
            >
              {saving ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
