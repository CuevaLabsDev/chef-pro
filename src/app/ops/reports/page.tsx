"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ComplianceEntry {
  locationId: string;
  locationName: string;
  periodName: string;
  totalExpected: number;
  totalSubmitted: number;
  totalReviewed: number;
  complianceRate: number;
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [compliance, setCompliance] = useState<ComplianceEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
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

      <Card>
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
      </Card>

      <Card>
        <CardTitle>
          Compliance Summary
          {loading && <span className="ml-2 text-sm text-gray-400">loading...</span>}
        </CardTitle>

        {compliance.length === 0 && !loading ? (
          <p className="text-sm text-gray-500 mt-3">No data for the selected range</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
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
                        className={`font-bold ${
                          c.complianceRate >= 80
                            ? "text-green-600"
                            : c.complianceRate >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
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
