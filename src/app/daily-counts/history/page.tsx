"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface SheetRow {
  id: string;
  date: string;
  status: "draft" | "submitted";
  submittedBy: { name: string } | null;
  template: {
    location: { id: string; name: string };
    tastingPeriod: { id: string; name: string };
  };
  summary: {
    grandTotal: number;
  };
}

export default function DailyCountsHistoryPage() {
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    let isActive = true;
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/daily-counts/sheets?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isActive) return;
        setSheets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setSheets([]);
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Count History</h1>
        <p className="text-sm text-muted-foreground">
          Browse past daily count sheets across your locations.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="history-from"
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            id="history-to"
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
          Sheets ({sheets.length}){loading && <span className="ml-2 text-xs">loading...</span>}
        </CardTitle>

        {!loading && sheets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No count sheets for the selected dates.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Cafe</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Total Used</th>
                  <th className="pb-2 font-medium">Submitted By</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet) => (
                  <tr key={sheet.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3">{formatDate(sheet.date)}</td>
                    <td className="py-3">
                      <Link
                        href={`/daily-counts?sheet=${sheet.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {sheet.template.location.name}
                      </Link>
                    </td>
                    <td className="py-3">{sheet.template.tastingPeriod.name}</td>
                    <td className="py-3 font-mono font-medium">{sheet.summary.grandTotal}</td>
                    <td className="py-3">{sheet.submittedBy?.name ?? "—"}</td>
                    <td className="py-3">
                      <Badge
                        className={
                          sheet.status === "submitted"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }
                      >
                        {sheet.status === "submitted" ? "Submitted" : "Draft"}
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
