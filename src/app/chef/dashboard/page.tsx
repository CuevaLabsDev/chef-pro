"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusColor, formatDate } from "@/lib/utils";

interface Session {
  id: string;
  date: string;
  status: string;
  location: { name: string };
  tastingPeriod: { name: string };
  items: { id: string }[];
}

export default function ChefDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/tastings?dateFrom=${today}&dateTo=${today}`)
      .then((r) => r.json())
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-xl font-bold text-gray-900">Today&apos;s Tastings</h1>
        <p className="text-sm text-gray-500">{formatDate(new Date())}</p>
      </div>

      {sessions.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-gray-500 mb-4">No tastings recorded for today</p>
          <Button onClick={() => router.push("/chef/tastings/new")}>Start a New Tasting</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/chef/tastings/${s.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.location.name}</p>
                  <p className="text-sm text-gray-500">{s.tastingPeriod.name}</p>
                </div>
                <div className="text-right">
                  <Badge className={statusColor(s.status)}>{s.status.replace("_", " ")}</Badge>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.items.length} item{s.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          <Button
            onClick={() => router.push("/chef/tastings/new")}
            className="w-full"
            variant="secondary"
          >
            + Add Another Tasting
          </Button>
        </div>
      )}
    </div>
  );
}
