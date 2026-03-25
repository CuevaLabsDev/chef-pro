"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { STATUS_DISPLAY_LABEL } from "@/modules/menu-signage/types";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
}

interface Packet {
  id: string;
  date: string;
  meal: string;
  status: string;
  theme?: string | null;
  location: { id: string; name: string };
  assignedChef?: { id: string; name: string } | null;
  items: { id: string }[];
  reviewSignatures?: { id: string }[];
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  for_final_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  finalized_for_service: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ready: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_service: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

type ViewWindow = "day" | "week";

interface ManagedKitchenAdmin {
  id: string;
  name: string;
  email: string;
  locationIds: string[];
  locations: { id: string; name: string }[];
  packetOverview: {
    total: number;
    byStatus: Record<string, number>;
  };
}

interface ManagerTeamResponse {
  managedKitchenAdmins: ManagedKitchenAdmin[];
  managerLocations: { id: string; name: string }[];
  range: { dateFrom: string; dateTo: string; window: ViewWindow };
}

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function MenuSignagePage() {
  const searchParams = useSearchParams();
  const initialViewAsKitchenAdminId = searchParams.get("viewAsKitchenAdminId") ?? "";
  const { data: session } = useSession();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teamData, setTeamData] = useState<ManagerTeamResponse | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [managedLocationDrafts, setManagedLocationDrafts] = useState<Record<string, string[]>>({});
  const [savingManagedKitchenAdminId, setSavingManagedKitchenAdminId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const [viewWindow, setViewWindow] = useState<ViewWindow>("day");
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [meal, setMeal] = useState("");
  const [status, setStatus] = useState("");
  const [viewAsKitchenAdminId, setViewAsKitchenAdminId] = useState(initialViewAsKitchenAdminId);

  const permissionKeys =
    (session?.user as unknown as { permissionKeys?: string[] } | undefined)?.permissionKeys ?? [];
  const canManageStructure = permissionKeys.includes("packets.manage_structure");
  const canFinalizeService = permissionKeys.includes("packets.finalize_service");
  const canViewAsKitchenAdmin = permissionKeys.includes("kitchen_admins.view_as");
  const canManageKitchenAdmins = permissionKeys.includes("kitchen_admins.manage");

  const dateRange = useMemo(() => {
    if (viewWindow === "day") {
      return { dateFrom: anchorDate, dateTo: anchorDate };
    }
    const end = new Date(anchorDate);
    const start = new Date(anchorDate);
    start.setDate(start.getDate() - 6);
    return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
  }, [anchorDate, viewWindow]);

  async function loadTeamData() {
    if (!canViewAsKitchenAdmin && !canManageKitchenAdmins) {
      setTeamData(null);
      return;
    }

    setTeamLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("window", viewWindow);
      params.set("date", anchorDate);
      const response = await fetch(`/api/kitchen-admin-manager/team?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load kitchen admin team data.");
      }

      setTeamData(payload);
      setManagedLocationDrafts(
        (payload.managedKitchenAdmins ?? []).reduce(
          (acc: Record<string, string[]>, kitchenAdmin: ManagedKitchenAdmin) => {
            acc[kitchenAdmin.id] = kitchenAdmin.locationIds;
            return acc;
          },
          {}
        )
      );
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not load kitchen admin team data.";
      toast.error(message);
    } finally {
      setTeamLoading(false);
    }
  }

  async function saveManagedKitchenAdminLocations(kitchenAdminId: string) {
    const locationIds = managedLocationDrafts[kitchenAdminId] ?? [];
    setSavingManagedKitchenAdminId(kitchenAdminId);

    try {
      const response = await fetch(`/api/kitchen-admin-manager/team/${kitchenAdminId}/locations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update kitchen admin locations.");
      }

      toast.success("Kitchen admin locations updated");
      await loadTeamData();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not update kitchen admin locations.";
      toast.error(message);
    } finally {
      setSavingManagedKitchenAdminId(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (viewAsKitchenAdminId) params.set("viewAsKitchenAdminId", viewAsKitchenAdminId);

    fetch(`/api/config/locations?${params.toString()}`)
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => setLocations([]));
  }, [viewAsKitchenAdminId]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("dateFrom", dateRange.dateFrom);
    params.set("dateTo", dateRange.dateTo);
    if (locationId) params.set("locationId", locationId);
    if (meal) params.set("meal", meal);
    if (status) params.set("status", status);
    if (viewAsKitchenAdminId) params.set("viewAsKitchenAdminId", viewAsKitchenAdminId);

    let isActive = true;
    fetch(`/api/packets?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isActive) return;
        setPackets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setPackets([]);
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [dateRange.dateFrom, dateRange.dateTo, locationId, meal, status, viewAsKitchenAdminId]);

  useEffect(() => {
    loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageKitchenAdmins, canViewAsKitchenAdmin, viewWindow, anchorDate]);

  const overviewStats = useMemo(() => {
    const total = packets.length;
    const draft = packets.filter((p) => p.status === "draft").length;
    const published = packets.filter((p) => p.status === "published").length;
    const forFinalReview = packets.filter((p) => p.status === "for_final_review").length;
    const finalizedForService = packets.filter((p) => p.status === "finalized_for_service").length;
    return { total, draft, published, forFinalReview, finalizedForService };
  }, [packets]);

  const packetsForFinalReview = useMemo(
    () => packets.filter((packet) => packet.status === "for_final_review"),
    [packets]
  );

  const viewAsOptions = teamData?.managedKitchenAdmins ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Signage</h1>
          <p className="text-sm text-muted-foreground">
            Build, review, and approve menus by location and meal.
          </p>
        </div>
        {canManageStructure && (
          <Link
            href={
              viewAsKitchenAdminId
                ? `/menu-signage/new?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
                : "/menu-signage/new"
            }
          >
            <Button>Create Menu</Button>
          </Link>
        )}
      </div>

      {(canViewAsKitchenAdmin || canManageKitchenAdmins) && (
        <Card className="p-4 space-y-4">
          <CardTitle className="text-base">Kitchen Admin Support View</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use this focused view to support one kitchen admin at a time without loading all
            locations.
          </p>
          <Select
            id="view-as-kitchen-admin"
            label="Support this kitchen admin"
            value={viewAsKitchenAdminId}
            onChange={(event) => {
              setViewAsKitchenAdminId(event.target.value);
              setLocationId("");
            }}
            options={viewAsOptions.map((entry) => ({
              value: entry.id,
              label: `${entry.name} (${entry.email})`,
            }))}
            placeholder="Default to your own view"
          />
          {viewAsKitchenAdminId && (
            <p className="text-xs text-muted-foreground">
              Actions stay logged under your account while this focused view is active.
            </p>
          )}
        </Card>
      )}

      {canManageKitchenAdmins && teamData && (
        <Card className="p-4 space-y-4">
          <CardTitle className="text-base">
            Kitchen Admin Manager Oversight
            {teamLoading && <span className="ml-2 text-xs text-muted-foreground">loading...</span>}
          </CardTitle>
          {teamData.managedKitchenAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No kitchen admins are currently assigned to your manager profile.
            </p>
          ) : (
            <div className="space-y-3">
              {teamData.managedKitchenAdmins.map((kitchenAdmin) => (
                <div
                  key={kitchenAdmin.id}
                  className="rounded-lg border border-border p-3 bg-muted/30 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{kitchenAdmin.name}</p>
                      <p className="text-xs text-muted-foreground">{kitchenAdmin.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Total: {kitchenAdmin.packetOverview.total}</span>
                      <span>
                        In Review: {kitchenAdmin.packetOverview.byStatus.for_final_review ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Managed locations</p>
                    {teamData.managerLocations.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        You do not have location access yet. Ask Ops to assign your locations first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {teamData.managerLocations.map((location) => (
                          <label
                            key={`${kitchenAdmin.id}-${location.id}`}
                            className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={
                                managedLocationDrafts[kitchenAdmin.id]?.includes(location.id) ??
                                false
                              }
                              onChange={(event) =>
                                setManagedLocationDrafts((prev) => {
                                  const current = prev[kitchenAdmin.id] ?? [];
                                  return {
                                    ...prev,
                                    [kitchenAdmin.id]: event.target.checked
                                      ? [...current, location.id]
                                      : current.filter((id) => id !== location.id),
                                  };
                                })
                              }
                              className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span>{location.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveManagedKitchenAdminLocations(kitchenAdmin.id)}
                      disabled={savingManagedKitchenAdminId === kitchenAdmin.id}
                    >
                      {savingManagedKitchenAdminId === kitchenAdmin.id
                        ? "Saving..."
                        : "Save Managed Locations"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Select
            id="ms-window"
            label="Window"
            value={viewWindow}
            onChange={(event) => {
              setLoading(true);
              setViewWindow(event.target.value as ViewWindow);
            }}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
            ]}
          />
          <Input
            id="ms-anchor-date"
            label={viewWindow === "day" ? "Date" : "Week ending"}
            type="date"
            value={anchorDate}
            onChange={(event) => {
              setLoading(true);
              setAnchorDate(event.target.value);
            }}
          />
          <Input id="ms-date-from" label="From" type="date" value={dateRange.dateFrom} disabled />
          <Input id="ms-date-to" label="To" type="date" value={dateRange.dateTo} disabled />
          <Select
            id="ms-location"
            label="Cafe"
            value={locationId}
            onChange={(e) => {
              setLoading(true);
              setLocationId(e.target.value);
            }}
            options={locations.map((location) => ({
              value: location.id,
              label: location.name,
            }))}
            placeholder="All"
          />
          <Select
            id="ms-meal"
            label="Meal"
            value={meal}
            onChange={(e) => {
              setLoading(true);
              setMeal(e.target.value);
            }}
            options={[
              { value: "Breakfast", label: "Breakfast" },
              { value: "Lunch", label: "Lunch" },
              { value: "Dinner", label: "Dinner" },
            ]}
            placeholder="All"
          />
          <Select
            id="ms-status"
            label="Status"
            value={status}
            onChange={(e) => {
              setLoading(true);
              setStatus(e.target.value);
            }}
            options={[
              { value: "draft", label: "Building" },
              { value: "published", label: "Ready for Review" },
              { value: "for_final_review", label: "In Review" },
              { value: "finalized_for_service", label: "Approved" },
            ]}
            placeholder="All"
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total
          </p>
          <p className="text-2xl font-bold text-foreground">{overviewStats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Building
          </p>
          <p className="text-2xl font-bold text-foreground">{overviewStats.draft}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Ready for Review
          </p>
          <p className="text-2xl font-bold text-foreground">{overviewStats.published}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            In Review
          </p>
          <p className="text-2xl font-bold text-foreground">{overviewStats.forFinalReview}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Approved
          </p>
          <p className="text-2xl font-bold text-foreground">{overviewStats.finalizedForService}</p>
        </Card>
      </div>

      {canFinalizeService && (
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
            In Review ({packetsForFinalReview.length})
          </CardTitle>
          {packetsForFinalReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No menus waiting for review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Cafe</th>
                    <th className="pb-2 font-medium">Meal</th>
                    <th className="pb-2 font-medium">Signatures</th>
                  </tr>
                </thead>
                <tbody>
                  {packetsForFinalReview.map((packet) => (
                    <tr key={packet.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">{formatDate(packet.date)}</td>
                      <td className="py-3">
                        <Link
                          href={
                            viewAsKitchenAdminId
                              ? `/menu-signage/${packet.id}?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
                              : `/menu-signage/${packet.id}`
                          }
                          className="text-primary hover:underline font-medium"
                        >
                          {packet.location.name}
                        </Link>
                      </td>
                      <td className="py-3">{packet.meal}</td>
                      <td className="py-3">{packet.reviewSignatures?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
          All Menus ({packets.length}){loading && <span className="ml-2 text-xs">loading...</span>}
        </CardTitle>

        {!loading && packets.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No menus for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Cafe</th>
                  <th className="pb-2 font-medium">Meal</th>
                  <th className="pb-2 font-medium">Theme</th>
                  <th className="pb-2 font-medium">Items</th>
                  <th className="pb-2 font-medium">Signatures</th>
                  <th className="pb-2 font-medium">Assigned</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((packet) => (
                  <tr key={packet.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3">{formatDate(packet.date)}</td>
                    <td className="py-3">
                      <Link
                        href={
                          viewAsKitchenAdminId
                            ? `/menu-signage/${packet.id}?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
                            : `/menu-signage/${packet.id}`
                        }
                        className="text-primary hover:underline font-medium"
                      >
                        {packet.location.name}
                      </Link>
                    </td>
                    <td className="py-3">{packet.meal}</td>
                    <td className="py-3">{packet.theme ?? "--"}</td>
                    <td className="py-3">{packet.items.length}</td>
                    <td className="py-3">{packet.reviewSignatures?.length ?? 0}</td>
                    <td className="py-3">{packet.assignedChef?.name ?? "Unassigned"}</td>
                    <td className="py-3">
                      <Badge
                        className={statusBadge[packet.status] ?? "bg-muted text-muted-foreground"}
                      >
                        {STATUS_DISPLAY_LABEL[packet.status] ?? packet.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
