"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { STATUS_DISPLAY_LABEL } from "@/modules/menu-signage/types";

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
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  for_final_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  finalized_for_service: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function ReviewDashboardPage() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [meal, setMeal] = useState("");

  useEffect(() => {
    fetch("/api/config/locations")
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("dateFrom", anchorDate);
    params.set("dateTo", anchorDate);
    if (locationId) params.set("locationId", locationId);
    if (meal) params.set("meal", meal);

    let isActive = true;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/packets?${params.toString()}`);
        const data = await r.json();
        if (isActive) setPackets(Array.isArray(data) ? data : []);
      } catch {
        if (isActive) setPackets([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void load();

    return () => {
      isActive = false;
    };
  }, [anchorDate, locationId, meal]);

  const reviewablePackets = useMemo(
    () => packets.filter((p) => ["published", "for_final_review"].includes(p.status)),
    [packets]
  );

  const approvedPackets = useMemo(
    () => packets.filter((p) => p.status === "finalized_for_service"),
    [packets]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Packet[]>();
    for (const packet of reviewablePackets) {
      const key = packet.location.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(packet);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [reviewablePackets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review Menus</h1>
        <p className="text-sm text-muted-foreground">
          Menus ready for your review today. Open a menu to edit items and add your signature.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            id="review-date"
            label="Date"
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
          />
          <Select
            id="review-location"
            label="Cafe"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="All"
          />
          <Select
            id="review-meal"
            label="Meal"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            options={[
              { value: "Breakfast", label: "Breakfast" },
              { value: "Lunch", label: "Lunch" },
              { value: "Dinner", label: "Dinner" },
            ]}
            placeholder="All"
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Ready for Review
          </p>
          <p className="text-2xl font-bold text-foreground">
            {reviewablePackets.filter((p) => p.status === "published").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            In Review
          </p>
          <p className="text-2xl font-bold text-foreground">
            {reviewablePackets.filter((p) => p.status === "for_final_review").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Approved
          </p>
          <p className="text-2xl font-bold text-foreground">{approvedPackets.length}</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reviewablePackets.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-muted-foreground">
            No menus need review for {formatDate(anchorDate)}.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([locationName, locationPackets]) => (
            <Card key={locationName} className="p-4">
              <CardTitle className="text-base mb-3">{locationName}</CardTitle>
              <div className="space-y-2">
                {locationPackets.map((packet) => (
                  <Link
                    key={packet.id}
                    href={`/menu-signage/${packet.id}/review`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {packet.meal}
                        {packet.theme ? ` · ${packet.theme}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {packet.items.length} items · {packet.reviewSignatures?.length ?? 0}{" "}
                        signatures
                      </p>
                    </div>
                    <Badge
                      className={statusBadge[packet.status] ?? "bg-muted text-muted-foreground"}
                    >
                      {STATUS_DISPLAY_LABEL[packet.status] ?? packet.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && approvedPackets.length > 0 && (
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-3">
            Approved ({approvedPackets.length})
          </CardTitle>
          <div className="space-y-2">
            {approvedPackets.map((packet) => (
              <Link
                key={packet.id}
                href={`/menu-signage/${packet.id}/review`}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors opacity-75"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {packet.location.name} · {packet.meal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {packet.items.length} items · {packet.reviewSignatures?.length ?? 0} signatures
                  </p>
                </div>
                <Badge className={statusBadge[packet.status] ?? "bg-muted text-muted-foreground"}>
                  Approved
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
