"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  MENU_PACKET_ALLERGEN_OPTIONS,
  MENU_PACKET_CATEGORY_OPTIONS,
  MENU_PACKET_DIET_TAG_OPTIONS,
} from "@/modules/menu-signage/types";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

interface Location {
  id: string;
  name: string;
}

interface PacketItemForm {
  category: (typeof MENU_PACKET_CATEGORY_OPTIONS)[number]["value"];
  itemName: string;
  ingredients: string;
  dietTags: string[];
  allergenTags: string[];
}

function emptyItem(): PacketItemForm {
  return {
    category: "entree",
    itemName: "",
    ingredients: "",
    dietTags: [],
    allergenTags: [],
  };
}

export default function NewMenuSignagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAsKitchenAdminId = searchParams.get("viewAsKitchenAdminId") ?? "";
  const [locations, setLocations] = useState<Location[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [meal, setMeal] = useState("Dinner");
  const [theme, setTheme] = useState("");
  const [items, setItems] = useState<PacketItemForm[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (viewAsKitchenAdminId) params.set("viewAsKitchenAdminId", viewAsKitchenAdminId);
    const queryString = params.toString();

    fetch(`/api/config/locations${queryString ? `?${queryString}` : ""}`)
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []));
  }, [viewAsKitchenAdminId]);

  function updateItem(index: number, partial: Partial<PacketItemForm>) {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function toggleAllergen(index: number, tag: string) {
    updateItem(index, {
      allergenTags: items[index].allergenTags.includes(tag)
        ? items[index].allergenTags.filter((entry) => entry !== tag)
        : [...items[index].allergenTags, tag],
    });
  }

  async function handleSubmit() {
    setError("");
    setSaving(true);

    const payload = {
      date,
      locationId,
      meal,
      theme,
      status: "draft",
      items: items.map((item, index) => ({
        category: item.category,
        itemName: item.itemName,
        ingredients: item.ingredients,
        dietTags: item.dietTags,
        allergenTags: item.allergenTags,
        sortOrder: index,
      })),
      viewAsKitchenAdminId: viewAsKitchenAdminId || undefined,
    };

    try {
      const response = await fetch("/api/packets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to create menu");
      }

      const packet = await response.json();
      router.push(
        viewAsKitchenAdminId
          ? `/menu-signage/${packet.id}?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
          : `/menu-signage/${packet.id}`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create menu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Create Menu</h1>
      {viewAsKitchenAdminId && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Focused support view is active. Actions are logged under your account.
        </div>
      )}

      <Card>
        <CardTitle>Menu Details</CardTitle>
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
            id="packet-theme"
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. TACO BAR"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Items ({items.length})</h2>

        {items.map((item, index) => (
          <Card key={index} className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-foreground">Item #{index + 1}</h3>
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
              <Textarea
                id={`item-ingredients-${index}`}
                label="Ingredients"
                value={item.ingredients}
                onChange={(e) => updateItem(index, { ingredients: e.target.value })}
                placeholder="Main ingredients list"
                className="sm:col-span-2"
              />
            </div>

            <Select
              id={`item-diet-${index}`}
              label="Diet Tag"
              value={item.dietTags[0] ?? ""}
              onChange={(e) =>
                updateItem(index, {
                  dietTags: e.target.value ? [e.target.value] : [],
                })
              }
              options={MENU_PACKET_DIET_TAG_OPTIONS.map((tag) => ({
                value: tag,
                label: tag,
              }))}
              placeholder="None"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Allergens</p>
              <div className="flex flex-wrap gap-2">
                {MENU_PACKET_ALLERGEN_OPTIONS.map((tag) => {
                  const selected = item.allergenTags.includes(tag);
                  return (
                    <Button
                      key={`${index}-allergen-${tag}`}
                      type="button"
                      size="sm"
                      variant={selected ? "primary" : "secondary"}
                      onClick={() => toggleAllergen(index, tag)}
                    >
                      {tag}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={addItem}>
          + Add Item
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() =>
            router.push(
              viewAsKitchenAdminId
                ? `/menu-signage?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
                : "/menu-signage"
            )
          }
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={
            saving ||
            !locationId ||
            !theme.trim() ||
            items.some((item) => !item.itemName || !item.ingredients)
          }
        >
          {saving ? "Creating..." : "Create Menu"}
        </Button>
      </div>
    </div>
  );
}
