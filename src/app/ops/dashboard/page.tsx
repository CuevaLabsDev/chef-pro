"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Session {
  id: string;
  date: string;
  status: string;
  location: { name: string };
  tastingPeriod: { name: string };
  chef: { name: string };
  items: { id: string }[];
}

interface Stats {
  total: number;
  draft: number;
  submitted: number;
  reviewed: number;
  locked: number;
}

export default function OpsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    submitted: 0,
    reviewed: 0,
    locked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/tastings?dateFrom=${today}&dateTo=${today}`)
      .then((r) => r.json())
      .then((data: Session[]) => {
        setSessions(data);
        setStats({
          total: data.length,
          draft: data.filter((s) => s.status === "draft").length,
          submitted: data.filter((s) => s.status === "submitted").length,
          reviewed: data.filter((s) => s.status === "reviewed").length,
          locked: data.filter((s) => s.status === "locked").length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const statCards = [
    { label: "Total", value: stats.total, color: "text-gray-900" },
    { label: "Drafts", value: stats.draft, color: "text-gray-500" },
    { label: "Submitted", value: stats.submitted, color: "text-blue-600" },
    { label: "Reviewed", value: stats.reviewed, color: "text-green-600" },
    { label: "Locked", value: stats.locked, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-sm text-gray-500">{formatDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="text-center py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Today&apos;s Sessions</CardTitle>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm mt-3">No sessions recorded today</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
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
