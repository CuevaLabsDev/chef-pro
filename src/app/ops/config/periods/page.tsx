"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Period {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export default function PeriodsConfigPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadPeriods() {
    fetch("/api/config/periods")
      .then((r) => r.json())
      .then(setPeriods)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPeriods();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/config/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sortOrder: periods.length }),
    });
    setName("");
    setSaving(false);
    loadPeriods();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tasting Periods</h1>

      <Card>
        <CardTitle>Add Period</CardTitle>
        <form onSubmit={handleCreate} className="mt-4 flex gap-3">
          <Input
            id="period-name"
            placeholder="e.g. Breakfast, Lunch, Dinner"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Current Periods ({periods.length})</CardTitle>
        {loading ? (
          <p className="text-sm text-muted-foreground mt-3">Loading...</p>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No periods configured yet</p>
        ) : (
          <div className="mt-4 divide-y">
            {periods.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6">#{p.sortOrder + 1}</span>
                  <p className="font-medium text-foreground">{p.name}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
