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
  packetDueTime?: string | null;
  tastingStart?: string | null;
  tastingEnd?: string | null;
  serviceStart?: string | null;
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
  const [packetDueTime, setPacketDueTime] = useState("");
  const [tastingStart, setTastingStart] = useState("");
  const [tastingEnd, setTastingEnd] = useState("");
  const [serviceStart, setServiceStart] = useState("");
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
      body: JSON.stringify({
        locationId,
        tastingPeriodId: periodId,
        deadlineTime,
        daysOfWeek,
        ...(packetDueTime && { packetDueTime }),
        ...(tastingStart && { tastingStart }),
        ...(tastingEnd && { tastingEnd }),
        ...(serviceStart && { serviceStart }),
      }),
    });
    setSaving(false);
    loadAll();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Location Schedules</h1>
      <p className="text-sm text-muted-foreground -mt-4">
        Set up daily timing for each cafe and meal period
      </p>

      <Card>
        <CardTitle>Add Schedule</CardTitle>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select
              id="dl-loc"
              label="Cafe / Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Select..."
            />
            <Select
              id="dl-per"
              label="Meal Period"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              options={periods.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select..."
            />
            <Input
              id="dl-time"
              label="Tasting Due By"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              id="dl-packet"
              label="Packet Due By"
              type="time"
              value={packetDueTime}
              onChange={(e) => setPacketDueTime(e.target.value)}
            />
            <Input
              id="dl-tstart"
              label="Tasting Start"
              type="time"
              value={tastingStart}
              onChange={(e) => setTastingStart(e.target.value)}
            />
            <Input
              id="dl-tend"
              label="Tasting End"
              type="time"
              value={tastingEnd}
              onChange={(e) => setTastingEnd(e.target.value)}
            />
            <Input
              id="dl-service"
              label="Service Start"
              type="time"
              value={serviceStart}
              onChange={(e) => setServiceStart(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Active Days</label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                    daysOfWeek.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving || !locationId || !periodId}>
            {saving ? "Saving..." : "Add Schedule"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Current Schedules ({rules.length})</CardTitle>
        {loading ? (
          <p className="text-sm text-muted-foreground mt-3">Loading...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No schedules set up yet</p>
        ) : (
          <div className="mt-4 divide-y">
            {rules.map((rule) => (
              <div key={rule.id} className="py-3">
                <p className="font-medium text-foreground">
                  {rule.location.name} &middot; {rule.tastingPeriod.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tasting due by {rule.deadlineTime} on{" "}
                  {rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")}
                </p>
                {(rule.packetDueTime ||
                  rule.tastingStart ||
                  rule.tastingEnd ||
                  rule.serviceStart) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {rule.packetDueTime && `Packet due ${rule.packetDueTime}`}
                    {rule.tastingStart && ` · Tasting ${rule.tastingStart}`}
                    {rule.tastingEnd && `–${rule.tastingEnd}`}
                    {rule.serviceStart && ` · Service at ${rule.serviceStart}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
