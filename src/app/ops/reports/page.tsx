"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ComplianceEntry {
  locationId: string;
  locationName: string;
  periodName: string;
  totalExpected: number;
  totalSubmitted: number;
  totalReviewed: number;
  complianceRate: number;
}

type QuickRange = "today" | "week" | "month" | "custom";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split("T")[0];
}

function getMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

export default function ReportsPage() {
  const [quickRange, setQuickRange] = useState<QuickRange>("today");
  const [dateFrom, setDateFrom] = useState(getToday);
  const [dateTo, setDateTo] = useState(getToday);
  const [compliance, setCompliance] = useState<ComplianceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const applyQuickRange = useCallback((range: QuickRange) => {
    setQuickRange(range);
    const today = getToday();
    switch (range) {
      case "today":
        setDateFrom(today);
        setDateTo(today);
        break;
      case "week":
        setDateFrom(getWeekStart());
        setDateTo(today);
        break;
      case "month":
        setDateFrom(getMonthStart());
        setDateTo(today);
        break;
      case "custom":
        break;
    }
    setLoading(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    fetch(`/api/reports?type=compliance&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isActive) return;
        setCompliance(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setCompliance([]);
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [dateFrom, dateTo]);

  function handleExport() {
    window.open(`/api/reports?type=export&dateFrom=${dateFrom}&dateTo=${dateTo}`, "_blank");
  }

  const quickRanges: { key: QuickRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            Export Tastings CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              window.open(
                `/api/reports?type=packet_export&dateFrom=${dateFrom}&dateTo=${dateTo}`,
                "_blank"
              )
            }
          >
            Export Packets CSV
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex gap-1">
            {quickRanges.map((r) => (
              <Button
                key={r.key}
                variant={quickRange === r.key ? "primary" : "ghost"}
                size="sm"
                className={cn(quickRange === r.key && "shadow-sm")}
                onClick={() => applyQuickRange(r.key)}
              >
                {r.label}
              </Button>
            ))}
          </div>

          {quickRange === "custom" && (
            <div className="flex gap-3">
              <Input
                id="rf"
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setLoading(true);
                  setDateFrom(e.target.value);
                }}
              />
              <Input
                id="rt"
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setLoading(true);
                  setDateTo(e.target.value);
                }}
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
          Compliance Summary
          {loading && <span className="ml-2 text-xs text-muted-foreground">loading...</span>}
        </CardTitle>

        {compliance.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground mt-3">No data for the selected range</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium text-right">Expected</th>
                  <th className="pb-2 font-medium text-right">Submitted</th>
                  <th className="pb-2 font-medium text-right">Reviewed</th>
                  <th className="pb-2 font-medium text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {compliance.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 font-medium">{c.locationName}</td>
                    <td className="py-3">{c.periodName}</td>
                    <td className="py-3 text-right">{c.totalExpected}</td>
                    <td className="py-3 text-right">{c.totalSubmitted}</td>
                    <td className="py-3 text-right">{c.totalReviewed}</td>
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          "font-bold",
                          c.complianceRate >= 80
                            ? "text-green-600"
                            : c.complianceRate >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                        )}
                      >
                        {c.complianceRate}%
                      </span>
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
