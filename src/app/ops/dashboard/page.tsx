"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ClipboardCheck,
  Package,
  BarChart3,
  Activity,
} from "lucide-react";

interface Session {
  id: string;
  date: string;
  status: string;
  location: { name: string };
  tastingPeriod: { name: string };
  chef: { name: string } | null;
  items: { id: string }[];
}

interface MealRating {
  locationId: string;
  locationName: string;
  period: string;
  avgRating: number | null;
  ratingCount: number;
}

interface Amendment {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  requestedBy: { name: string };
  item: { itemName: string } | null;
  packet: { meal: string; location: { name: string } };
}

interface DashboardStats {
  today: {
    total: number;
    draft: number;
    submitted: number;
    reviewed: number;
    locked: number;
  };
  complianceRate: number;
  pendingReviews: number;
  activePackets: number;
  yesterdayTotal: number;
  weekTrend: { date: string; total: number; compliant: number; rate: number }[];
  packetStatus: Record<string, number>;
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="size-3 text-muted-foreground" />;
  if (previous === 0) return <TrendingUp className="size-3 text-green-600" />;
  const diff = Math.round(((current - previous) / previous) * 100);
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600">
        <TrendingUp className="size-3" /> +{diff}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-500">
        <TrendingDown className="size-3" /> {diff}%
      </span>
    );
  return <Minus className="size-3 text-muted-foreground" />;
}

export default function OpsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mealRatings, setMealRatings] = useState<MealRating[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      fetch(`/api/tastings?dateFrom=${today}&dateTo=${today}`).then((r) => r.json()),
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch(`/api/reports/meal-ratings?dateFrom=${today}&dateTo=${today}`).then((r) => r.json()),
      fetch(`/api/packets/amendments?dateFrom=${today}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([sessionsData, statsData, ratingsData, amendmentsData]) => {
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setStats(statsData);
        setMealRatings(Array.isArray(ratingsData) ? ratingsData : []);
        setAmendments(Array.isArray(amendmentsData) ? amendmentsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statusBarData = [
    { name: "Draft", value: stats.today.draft, fill: "var(--muted-foreground)" },
    { name: "Submitted", value: stats.today.submitted, fill: "var(--chart-1)" },
    { name: "Reviewed", value: stats.today.reviewed, fill: "var(--chart-2)" },
    { name: "Locked", value: stats.today.locked, fill: "var(--chart-5)" },
  ];

  const kpiCards = [
    {
      label: "Sessions Today",
      value: stats.today.total,
      icon: Activity,
      trend: <TrendIndicator current={stats.today.total} previous={stats.yesterdayTotal} />,
    },
    {
      label: "Compliance Rate",
      value: `${stats.complianceRate}%`,
      icon: BarChart3,
      trend: null,
    },
    {
      label: "Pending Reviews",
      value: stats.pendingReviews,
      icon: ClipboardCheck,
      trend: null,
    },
    {
      label: "Active Packets",
      value: stats.activePackets,
      icon: Package,
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {kpi.label}
                </span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
                {kpi.trend}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
            Sessions by Status
          </CardTitle>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
            Compliance Trend (7 days)
          </CardTitle>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weekTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString("en-US", { weekday: "short" });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number | undefined) => [`${value ?? 0}%`, "Compliance"]}
                  labelFormatter={(label) => {
                    const d = new Date(label + "T00:00:00");
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <defs>
                  <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#complianceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
            How&apos;s the Food Today
          </CardTitle>
          {mealRatings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tastings completed yet today</p>
          ) : (
            <div className="space-y-2">
              {mealRatings.map((r) => (
                <div
                  key={`${r.locationId}-${r.period}`}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm font-medium">
                    {r.locationName} &middot; {r.period}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      r.avgRating == null
                        ? "text-muted-foreground"
                        : r.avgRating <= 2
                          ? "text-red-500"
                          : r.avgRating >= 4
                            ? "text-green-600"
                            : "text-foreground"
                    }`}
                  >
                    {r.avgRating != null ? `${r.avgRating}/5` : "—"}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({r.ratingCount})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
            Sign Changes &amp; Updates
          </CardTitle>
          {amendments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sign changes requested today</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {amendments.map((a) => (
                <div key={a.id} className="border-b last:border-0 pb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {a.packet.location.name} &middot; {a.packet.meal}
                    </span>
                    <Badge
                      className={
                        a.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : a.status === "applied"
                            ? "bg-green-100 text-green-800"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {a.status === "pending"
                        ? "Waiting"
                        : a.status === "applied"
                          ? "Done"
                          : "Skipped"}
                    </Badge>
                  </div>
                  <p className="text-sm mt-0.5">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {a.requestedBy.name} &middot;{" "}
                    {a.type === "item_change"
                      ? "dish update"
                      : a.type === "backup_swap"
                        ? "backup swap"
                        : a.type === "item_removed"
                          ? "dish removed"
                          : a.type === "item_added"
                            ? "dish added"
                            : a.type.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground mb-4">
          Today&apos;s Sessions
        </CardTitle>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm mt-3">No tastings recorded today yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Chef</th>
                  <th className="pb-2 font-medium">Items</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3">
                      <Link
                        href={`/ops/reviews/${s.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {s.location.name}
                      </Link>
                    </td>
                    <td className="py-3">{s.tastingPeriod.name}</td>
                    <td className="py-3">{s.chef?.name ?? "—"}</td>
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
