"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function LocationsConfigPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadLocations() {
    fetch("/api/config/locations")
      .then((r) => r.json())
      .then(setLocations)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLocations();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/config/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    });
    setName("");
    setDescription("");
    setSaving(false);
    loadLocations();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Locations / Cafes</h1>

      <Card>
        <CardTitle>Add Location</CardTitle>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col sm:flex-row gap-3">
          <Input
            id="loc-name"
            placeholder="Location name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            id="loc-desc"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Current Locations ({locations.length})</CardTitle>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Loading...</p>
        ) : locations.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No locations configured yet</p>
        ) : (
          <div className="mt-4 divide-y">
            {locations.map((loc) => (
              <div key={loc.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{loc.name}</p>
                  {loc.description && <p className="text-sm text-gray-500">{loc.description}</p>}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${loc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {loc.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
