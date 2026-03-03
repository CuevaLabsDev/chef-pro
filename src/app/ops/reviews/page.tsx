"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { statusColor, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
}
interface Period {
  id: string;
  name: string;
}

interface Session {
  id: string;
  date: string;
  status: string;
  location: { name: string };
  tastingPeriod: { name: string };
  chef: { name: string };
  items: { id: string }[];
}

export default function ReviewsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/config/locations").then((r) => r.json()),
      fetch("/api/config/periods").then((r) => r.json()),
    ]).then(([locs, pers]) => {
      setLocations(locs);
      setPeriods(pers);
    });
  }, []);

  useEffect(() => {
    let isActive = true;
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (locationId) params.set("locationId", locationId);
    if (periodId) params.set("periodId", periodId);
    if (status) params.set("status", status);

    fetch(`/api/tastings?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isActive) return;
        setSessions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setSessions([]);
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [dateFrom, dateTo, locationId, periodId, status]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>

      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input
            id="df"
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setLoading(true);
              setDateFrom(e.target.value);
            }}
          />
          <Input
            id="dt"
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setLoading(true);
              setDateTo(e.target.value);
            }}
          />
          <Select
            id="loc"
            label="Location"
            value={locationId}
            onChange={(e) => {
              setLoading(true);
              setLocationId(e.target.value);
            }}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="All"
          />
          <Select
            id="per"
            label="Period"
            value={periodId}
            onChange={(e) => {
              setLoading(true);
              setPeriodId(e.target.value);
            }}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="All"
          />
          <Select
            id="st"
            label="Status"
            value={status}
            onChange={(e) => {
              setLoading(true);
              setStatus(e.target.value);
            }}
            options={[
              { value: "draft", label: "Draft" },
              { value: "submitted", label: "Submitted" },
              { value: "reviewed", label: "Reviewed" },
              { value: "locked", label: "Locked" },
            ]}
            placeholder="All"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>
          Sessions ({sessions.length})
          {loading && <span className="ml-2 text-sm text-gray-400">loading...</span>}
        </CardTitle>

        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm mt-3">No sessions match the current filters</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Chef</th>
                  <th className="pb-2 font-medium">Items</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">{formatDate(s.date)}</td>
                    <td className="py-3">
                      <Link
                        href={`/ops/reviews/${s.id}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {s.location.name}
                      </Link>
                    </td>
                    <td className="py-3">{s.tastingPeriod.name}</td>
                    <td className="py-3">{s.chef.name}</td>
                    <td className="py-3">{s.items.length}</td>
                    <td className="py-3">
                      <Badge className={statusColor(s.status)}>{s.status}</Badge>
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
