"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MENU_PACKET_CATEGORY_OPTIONS } from "@/modules/menu-signage/types";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Location {
  id: string;
  name: string;
}

interface PacketItemForm {
  category: (typeof MENU_PACKET_CATEGORY_OPTIONS)[number]["value"];
  itemName: string;
  ingredients: string;
  theme: string;
  dietTags: string;
  allergenTags: string;
}

function emptyItem(): PacketItemForm {
  return {
    category: "entree",
    itemName: "",
    ingredients: "",
    theme: "",
    dietTags: "",
    allergenTags: "",
  };
}

export default function NewPacketPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [meal, setMeal] = useState("Dinner");
  const [market, setMarket] = useState("");
  const [cafe, setCafe] = useState("");
  const [items, setItems] = useState<PacketItemForm[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config/locations")
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []));
  }, []);

  function updateItem(index: number, partial: Partial<PacketItemForm>) {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit() {
    setError("");
    setSaving(true);

    const payload = {
      date,
      locationId,
      meal,
      market: market || undefined,
      cafe: cafe || undefined,
      status: "draft",
      items: items.map((item, index) => ({
        category: item.category,
        itemName: item.itemName,
        ingredients: item.ingredients,
        theme: item.theme || undefined,
        dietTags: item.dietTags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        allergenTags: item.allergenTags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        sortOrder: index,
      })),
    };

    try {
      const response = await fetch("/api/packets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to create packet");
      }

      const packet = await response.json();
      router.push(`/packets/${packet.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create packet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create Menu Signage Packet</h1>

      <Card>
        <CardTitle>Packet Details</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <Input
            id="packet-date"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select
            id="packet-location"
            label="Cafe"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locations.map((location) => ({
              value: location.id,
              label: location.name,
            }))}
            placeholder="Select a cafe..."
          />
          <Select
            id="packet-meal"
            label="Meal"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            options={[
              { value: "Breakfast", label: "Breakfast" },
              { value: "Lunch", label: "Lunch" },
              { value: "Dinner", label: "Dinner" },
            ]}
          />
          <Input
            id="packet-market"
            label="Market"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Optional market name"
          />
          <Input
            id="packet-cafe"
            label="Cafe Label"
            value={cafe}
            onChange={(e) => setCafe(e.target.value)}
            placeholder="Optional display cafe name"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Items ({items.length})</h2>
          <Button variant="secondary" onClick={addItem}>
            + Add Item
          </Button>
        </div>

        {items.map((item, index) => (
          <Card key={index} className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-gray-900">Item #{index + 1}</h3>
              {items.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                id={`item-category-${index}`}
                label="Category"
                value={item.category}
                onChange={(e) =>
                  updateItem(index, {
                    category: e.target.value as PacketItemForm["category"],
                  })
                }
                options={MENU_PACKET_CATEGORY_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
              <Input
                id={`item-name-${index}`}
                label="Item Name"
                value={item.itemName}
                onChange={(e) => updateItem(index, { itemName: e.target.value })}
                placeholder="e.g. Mojo Chicken"
              />
              <Input
                id={`item-theme-${index}`}
                label="Theme"
                value={item.theme}
                onChange={(e) => updateItem(index, { theme: e.target.value })}
                placeholder="e.g. BUILD YOUR OWN CUBAN BOWL"
              />
              <Input
                id={`item-diets-${index}`}
                label="Diet Tags (comma separated)"
                value={item.dietTags}
                onChange={(e) => updateItem(index, { dietTags: e.target.value })}
                placeholder="Halal, Vegetarian, Vegan"
              />
              <Input
                id={`item-allergens-${index}`}
                label="Allergens (comma separated)"
                value={item.allergenTags}
                onChange={(e) => updateItem(index, { allergenTags: e.target.value })}
                placeholder="Gluten, Eggs, Milk"
              />
            </div>
            <Input
              id={`item-ingredients-${index}`}
              label="Ingredients"
              value={item.ingredients}
              onChange={(e) => updateItem(index, { ingredients: e.target.value })}
              placeholder="Main ingredients list"
            />
          </Card>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => router.push("/packets")}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={
            saving || !locationId || items.some((item) => !item.itemName || !item.ingredients)
          }
        >
          {saving ? "Creating..." : "Create Packet"}
        </Button>
      </div>
    </div>
  );
}
