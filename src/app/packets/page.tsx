"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface Packet {
  id: string;
  date: string;
  meal: string;
  status: string;
  location: { id: string; name: string };
  assignedChef?: { id: string; name: string } | null;
  items: { id: string }[];
  checklistMenuPackage: boolean;
  checklistDigitalSignage: boolean;
  checklistFoodCards: boolean;
  backupReady: boolean;
  backupUsed: boolean;
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  ready: "bg-blue-100 text-blue-700",
  in_service: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export default function PacketsPage() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [meal, setMeal] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/config/locations")
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (locationId) params.set("locationId", locationId);
    if (meal) params.set("meal", meal);
    if (status) params.set("status", status);

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
  }, [dateFrom, dateTo, locationId, meal, status]);

  const completionStats = useMemo(() => {
    const total = packets.length;
    const completed = packets.filter((packet) => packet.status === "completed").length;
    const backupReady = packets.filter((packet) => packet.backupReady).length;
    return { total, completed, backupReady };
  }, [packets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Signage Packets</h1>
          <p className="text-sm text-gray-500">
            Track packet structure, pre-service checklist, and Back-Up readiness.
          </p>
        </div>
        <Link href="/packets/new">
          <Button>Create Packet</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="py-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{completionStats.total}</p>
          <p className="text-xs text-gray-500">Total Packets</p>
        </Card>
        <Card className="py-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completionStats.completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </Card>
        <Card className="py-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{completionStats.backupReady}</p>
          <p className="text-xs text-gray-500">Back-Up Ready</p>
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input
            id="packets-date-from"
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setLoading(true);
              setDateFrom(e.target.value);
            }}
          />
          <Input
            id="packets-date-to"
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setLoading(true);
              setDateTo(e.target.value);
            }}
          />
          <Select
            id="packets-location"
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
            id="packets-meal"
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
            id="packets-status"
            label="Status"
            value={status}
            onChange={(e) => {
              setLoading(true);
              setStatus(e.target.value);
            }}
            options={[
              { value: "draft", label: "Draft" },
              { value: "ready", label: "Ready" },
              { value: "in_service", label: "In Service" },
              { value: "completed", label: "Completed" },
            ]}
            placeholder="All"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>
          Packet List ({packets.length})
          {loading && <span className="ml-2 text-sm text-gray-400">loading...</span>}
        </CardTitle>

        {!loading && packets.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No packets for the selected filters.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Cafe</th>
                  <th className="pb-2 font-medium">Meal</th>
                  <th className="pb-2 font-medium">Items</th>
                  <th className="pb-2 font-medium">Assigned</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((packet) => (
                  <tr key={packet.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">{formatDate(packet.date)}</td>
                    <td className="py-3">
                      <Link
                        href={`/packets/${packet.id}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {packet.location.name}
                      </Link>
                    </td>
                    <td className="py-3">{packet.meal}</td>
                    <td className="py-3">{packet.items.length}</td>
                    <td className="py-3">{packet.assignedChef?.name ?? "Unassigned"}</td>
                    <td className="py-3">
                      <Badge className={statusBadge[packet.status] ?? "bg-gray-100 text-gray-700"}>
                        {packet.status.replace("_", " ")}
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
