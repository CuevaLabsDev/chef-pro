"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface PacketChecklist {
  id: string;
  meal: string;
  location: { name: string };
  checklistMenuPackage: boolean;
  checklistDigitalSignage: boolean;
  checklistFoodCards: boolean;
  checklistNotes: string | null;
}

export default function ChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const [packet, setPacket] = useState<PacketChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [menuPackage, setMenuPackage] = useState(false);
  const [digitalSignage, setDigitalSignage] = useState(false);
  const [foodCards, setFoodCards] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/packets/${params.packetId}`)
      .then((r) => r.json())
      .then((data) => {
        setPacket(data);
        setMenuPackage(data.checklistMenuPackage ?? false);
        setDigitalSignage(data.checklistDigitalSignage ?? false);
        setFoodCards(data.checklistFoodCards ?? false);
        setNotes(data.checklistNotes ?? "");
      })
      .finally(() => setLoading(false));
  }, [params.packetId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/packets/${params.packetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "execution",
          data: {
            checklistMenuPackage: menuPackage,
            checklistDigitalSignage: digitalSignage,
            checklistFoodCards: foodCards,
            checklistNotes: notes || null,
          },
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPacket((prev) =>
          prev
            ? {
                ...prev,
                checklistMenuPackage: updated.checklistMenuPackage,
                checklistDigitalSignage: updated.checklistDigitalSignage,
                checklistFoodCards: updated.checklistFoodCards,
                checklistNotes: updated.checklistNotes,
              }
            : prev
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !packet) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const allComplete = menuPackage && digitalSignage && foodCards;
  const checklistItems = [
    { label: "Menu package reviewed and signed", checked: menuPackage, set: setMenuPackage },
    { label: "Digital sign boards checked", checked: digitalSignage, set: setDigitalSignage },
    { label: "Food cards checked", checked: foodCards, set: setFoodCards },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/chef/dashboard")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pre-Service Checklist</h1>
          <p className="text-sm text-muted-foreground">
            {packet.location.name} &middot; {packet.meal}
          </p>
        </div>
      </div>

      <Card>
        <CardTitle>Checklist Items</CardTitle>
        {allComplete ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            All items complete
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Complete this checklist 1&ndash;1.5 hours after the tasting.
          </p>
        )}
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <label key={item.label} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.set(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span
                className={`text-sm ${item.checked ? "text-foreground line-through opacity-60" : "text-foreground"}`}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Notes</CardTitle>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Card>

      <div className="flex gap-3 pb-6">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => router.push("/chef/dashboard")}
        >
          Back
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Checklist"}
        </Button>
      </div>
    </div>
  );
}
