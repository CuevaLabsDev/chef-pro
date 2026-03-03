"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { TastingItemForm } from "@/components/chef/tasting-item-form";

interface Location {
  id: string;
  name: string;
}
interface Period {
  id: string;
  name: string;
}
interface PacketOption {
  id: string;
  meal: string;
  status: string;
  location: { name: string };
}
interface RatingQuestion {
  id: string;
  label: string;
  type: string;
  scaleMin?: number;
  scaleMax?: number;
  isRequired: boolean;
  sortOrder: number;
}
interface ItemData {
  dishName: string;
  sortOrder: number;
  temperatureCompliance: "compliant" | "non_compliant" | "not_checked";
  adjustmentsNeeded: string;
  ranOutTime: string;
  serviceGapMins: number | undefined;
  backupNotes: string;
  fteNotes: string;
  ratings: { questionId: string; numericValue?: number; textValue?: string }[];
  photoUrl?: string;
}

function emptyItem(sortOrder: number, questions: RatingQuestion[]): ItemData {
  return {
    dishName: "",
    sortOrder,
    temperatureCompliance: "not_checked",
    adjustmentsNeeded: "",
    ranOutTime: "",
    serviceGapMins: undefined,
    backupNotes: "",
    fteNotes: "",
    ratings: questions.map((q) => ({
      questionId: q.id,
      numericValue: 0,
      textValue: "",
    })),
  };
}

export default function NewTastingPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [questions, setQuestions] = useState<RatingQuestion[]>([]);
  const [locationId, setLocationId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [menuPacketId, setMenuPacketId] = useState("");
  const [availablePackets, setAvailablePackets] = useState<PacketOption[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [managerName, setManagerName] = useState("");
  const [menuName, setMenuName] = useState("");
  const [checklistMenuPackage, setChecklistMenuPackage] = useState(false);
  const [checklistDigitalSignage, setChecklistDigitalSignage] = useState(false);
  const [checklistFoodCards, setChecklistFoodCards] = useState(false);
  const [items, setItems] = useState<ItemData[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/config/locations").then((r) => r.json()),
      fetch("/api/config/periods").then((r) => r.json()),
      fetch("/api/config/schema").then((r) => r.json()),
    ]).then(([locs, pers, schema]) => {
      setLocations(locs);
      setPeriods(pers);
      const qs = schema?.questions ?? [];
      setQuestions(qs);
      setItems([emptyItem(0, qs)]);
    });
  }, []);

  useEffect(() => {
    if (!locationId || !periodId || !date) {
      setAvailablePackets([]);
      setMenuPacketId("");
      return;
    }

    const periodName = periods.find((period) => period.id === periodId)?.name ?? "";
    if (!periodName) return;

    const params = new URLSearchParams({
      dateFrom: date,
      dateTo: date,
      locationId,
      meal: periodName,
    });
    fetch(`/api/packets?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const packetList = Array.isArray(data) ? data : [];
        setAvailablePackets(packetList);
        if (
          menuPacketId &&
          !packetList.some((packet: PacketOption) => packet.id === menuPacketId)
        ) {
          setMenuPacketId("");
        }
      })
      .catch(() => {
        setAvailablePackets([]);
      });
  }, [date, locationId, periodId, periods, menuPacketId]);

  function addItem() {
    setItems((prev) => [...prev, emptyItem(prev.length, questions)]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, updated: ItemData) {
    setItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
  }

  async function handleSave(submit: boolean) {
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          locationId,
          tastingPeriodId: periodId,
          menuSignagePacketId: menuPacketId || undefined,
          managerName: managerName || undefined,
          menuName: menuName || undefined,
          checklistMenuPackage,
          checklistDigitalSignage,
          checklistFoodCards,
          items: items.map((item, i) => ({ ...item, sortOrder: i })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.fieldErrors ? "Validation errors" : data.error);
      }

      const tasting = await res.json();

      if (submit) {
        await fetch(`/api/tastings/${tasting.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
      }

      router.push("/chef/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">New Tasting</h1>

      <Card>
        <CardTitle>Session Details</CardTitle>
        <div className="space-y-3 mt-4">
          <Input
            id="date"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Select
            id="location"
            label="Location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Select location..."
          />

          <Select
            id="period"
            label="Tasting Period"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select period..."
          />

          <Select
            id="packet-link"
            label="Menu Signage Packet (optional)"
            value={menuPacketId}
            onChange={(e) => setMenuPacketId(e.target.value)}
            options={availablePackets.map((packet) => ({
              value: packet.id,
              label: `${packet.location.name} · ${packet.meal} · ${packet.status}`,
            }))}
            placeholder={
              availablePackets.length > 0
                ? "Select linked packet..."
                : "No packet for selected date/location/meal"
            }
          />

          <Input
            id="managerName"
            label="Manager Name"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="e.g. Jenny Raven"
          />

          <Input
            id="menuName"
            label="Menu Name (optional)"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="e.g. American 1"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Pre-service Checklist</CardTitle>
        <div className="space-y-3 mt-4">
          {[
            {
              label: "Menu package reviewed and signed",
              checked: checklistMenuPackage,
              set: setChecklistMenuPackage,
            },
            {
              label: "Digital sign boards checked",
              checked: checklistDigitalSignage,
              set: setChecklistDigitalSignage,
            },
            {
              label: "Food cards checked",
              checked: checklistFoodCards,
              set: setChecklistFoodCards,
            },
          ].map((item) => (
            <label key={item.label} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.set(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Dishes ({items.length})</h2>
          <Button onClick={addItem} variant="secondary" size="sm">
            + Add Dish
          </Button>
        </div>

        {items.map((item, index) => (
          <TastingItemForm
            key={index}
            item={item}
            index={index}
            questions={questions}
            onChange={(updated) => updateItem(index, updated)}
            onRemove={() => removeItem(index)}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 pb-6">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => handleSave(false)}
          disabled={saving || !locationId || !periodId}
        >
          Save Draft
        </Button>
        <Button
          className="flex-1"
          onClick={() => handleSave(true)}
          disabled={saving || !locationId || !periodId}
        >
          {saving ? "Saving..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
