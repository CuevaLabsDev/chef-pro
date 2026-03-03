"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Location {
  id: string;
  name: string;
}
interface Period {
  id: string;
  name: string;
}
interface DeadlineRule {
  id: string;
  deadlineTime: string;
  daysOfWeek: number[];
  location: { name: string };
  tastingPeriod: { name: string };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DeadlinesConfigPage() {
  const [rules, setRules] = useState<DeadlineRule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [locationId, setLocationId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    Promise.all([
      fetch("/api/config/deadlines").then((r) => r.json()),
      fetch("/api/config/locations").then((r) => r.json()),
      fetch("/api/config/periods").then((r) => r.json()),
    ]).then(([r, l, p]) => {
      setRules(r);
      setLocations(l);
      setPeriods(p);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !periodId) return;
    setSaving(true);
    await fetch("/api/config/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, tastingPeriodId: periodId, deadlineTime, daysOfWeek }),
    });
    setSaving(false);
    loadAll();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Deadline Rules</h1>

      <Card>
        <CardTitle>Add Deadline Rule</CardTitle>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select
              id="dl-loc"
              label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Select..."
            />
            <Select
              id="dl-per"
              label="Period"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              options={periods.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select..."
            />
            <Input
              id="dl-time"
              label="Deadline Time"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Active Days</label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                    daysOfWeek.includes(i)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving || !locationId || !periodId}>
            {saving ? "Saving..." : "Create Rule"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Current Rules ({rules.length})</CardTitle>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Loading...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No deadline rules configured</p>
        ) : (
          <div className="mt-4 divide-y">
            {rules.map((rule) => (
              <div key={rule.id} className="py-3">
                <p className="font-medium text-gray-900">
                  {rule.location.name} &middot; {rule.tastingPeriod.name}
                </p>
                <p className="text-sm text-gray-500">
                  By {rule.deadlineTime} on {rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
