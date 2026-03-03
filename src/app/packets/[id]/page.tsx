"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MENU_PACKET_CATEGORY_OPTIONS } from "@/modules/menu-signage/types";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PacketItem {
  id: string;
  category: (typeof MENU_PACKET_CATEGORY_OPTIONS)[number]["value"];
  itemName: string;
  ingredients: string;
  theme?: string | null;
  dietTags: string[];
  allergenTags: string[];
  sortOrder: number;
  isReadyForService: boolean;
  wasUsed: boolean;
  notes?: string | null;
}

interface PacketDetail {
  id: string;
  date: string;
  meal: string;
  market?: string | null;
  cafe?: string | null;
  status: string;
  locationId: string;
  location: { id: string; name: string };
  checklistMenuPackage: boolean;
  checklistDigitalSignage: boolean;
  checklistFoodCards: boolean;
  checklistNotes?: string | null;
  backupReady: boolean;
  backupUsed: boolean;
  backupNotes?: string | null;
  items: PacketItem[];
}

interface PacketItemForm {
  category: PacketItem["category"];
  itemName: string;
  ingredients: string;
  theme: string;
  dietTags: string;
  allergenTags: string;
  sortOrder: number;
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  ready: "bg-blue-100 text-blue-700",
  in_service: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

function mapToStructureItem(item: PacketItem): PacketItemForm {
  return {
    category: item.category,
    itemName: item.itemName,
    ingredients: item.ingredients,
    theme: item.theme ?? "",
    dietTags: item.dietTags.join(", "),
    allergenTags: item.allergenTags.join(", "),
    sortOrder: item.sortOrder,
  };
}

function emptyStructureItem(sortOrder: number): PacketItemForm {
  return {
    category: "entree",
    itemName: "",
    ingredients: "",
    theme: "",
    dietTags: "",
    allergenTags: "",
    sortOrder,
  };
}

export default function PacketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [packet, setPacket] = useState<PacketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingStructure, setSavingStructure] = useState(false);
  const [savingExecution, setSavingExecution] = useState(false);

  const [structureDate, setStructureDate] = useState("");
  const [structureMeal, setStructureMeal] = useState("");
  const [structureMarket, setStructureMarket] = useState("");
  const [structureCafe, setStructureCafe] = useState("");
  const [structureStatus, setStructureStatus] = useState("");
  const [structureItems, setStructureItems] = useState<PacketItemForm[]>([]);

  const [executionStatus, setExecutionStatus] = useState("draft");
  const [checklistMenuPackage, setChecklistMenuPackage] = useState(false);
  const [checklistDigitalSignage, setChecklistDigitalSignage] = useState(false);
  const [checklistFoodCards, setChecklistFoodCards] = useState(false);
  const [checklistNotes, setChecklistNotes] = useState("");
  const [backupReady, setBackupReady] = useState(false);
  const [backupUsed, setBackupUsed] = useState(false);
  const [backupNotes, setBackupNotes] = useState("");
  const [itemExecution, setItemExecution] = useState<
    Record<string, { isReadyForService: boolean; wasUsed: boolean; notes: string }>
  >({});

  const permissionKeys =
    (session?.user as unknown as { permissionKeys?: string[] } | undefined)?.permissionKeys ?? [];
  const canManageStructure =
    permissionKeys.includes("packets.manage_structure") ||
    permissionKeys.includes("packets.override");
  const canExecute =
    permissionKeys.includes("packets.execute") || permissionKeys.includes("packets.override");

  useEffect(() => {
    fetch(`/api/packets/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.id) {
          throw new Error(data?.error ?? "Failed to load packet");
        }
        setPacket(data);
        setStructureDate(new Date(data.date).toISOString().split("T")[0]);
        setStructureMeal(data.meal);
        setStructureMarket(data.market ?? "");
        setStructureCafe(data.cafe ?? "");
        setStructureStatus(data.status);
        setStructureItems(data.items.map(mapToStructureItem));

        setExecutionStatus(data.status);
        setChecklistMenuPackage(Boolean(data.checklistMenuPackage));
        setChecklistDigitalSignage(Boolean(data.checklistDigitalSignage));
        setChecklistFoodCards(Boolean(data.checklistFoodCards));
        setChecklistNotes(data.checklistNotes ?? "");
        setBackupReady(Boolean(data.backupReady));
        setBackupUsed(Boolean(data.backupUsed));
        setBackupNotes(data.backupNotes ?? "");

        const executionMap: Record<
          string,
          { isReadyForService: boolean; wasUsed: boolean; notes: string }
        > = {};
        for (const item of data.items as PacketItem[]) {
          executionMap[item.id] = {
            isReadyForService: item.isReadyForService,
            wasUsed: item.wasUsed,
            notes: item.notes ?? "",
          };
        }
        setItemExecution(executionMap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load packet"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const backUpItems = useMemo(
    () =>
      packet?.items
        .filter((item) => item.category === "back_up")
        .map((item) => ({
          ...item,
          ...itemExecution[item.id],
        })) ?? [],
    [packet, itemExecution]
  );

  function updateStructureItem(index: number, partial: Partial<PacketItemForm>) {
    setStructureItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item))
    );
  }

  function addStructureItem() {
    setStructureItems((prev) => [...prev, emptyStructureItem(prev.length)]);
  }

  function removeStructureItem(index: number) {
    setStructureItems((prev) =>
      prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, sortOrder: idx }))
    );
  }

  async function saveStructure() {
    if (!packet) return;
    setError("");
    setSavingStructure(true);

    try {
      const response = await fetch(`/api/packets/${packet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "structure",
          data: {
            date: structureDate,
            meal: structureMeal,
            market: structureMarket || undefined,
            cafe: structureCafe || undefined,
            status: structureStatus,
            items: structureItems.map((item, index) => ({
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
          },
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to save structure");
      }

      const updated = await response.json();
      setPacket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save structure");
    } finally {
      setSavingStructure(false);
    }
  }

  async function saveExecution() {
    if (!packet) return;
    setError("");
    setSavingExecution(true);

    try {
      const response = await fetch(`/api/packets/${packet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "execution",
          data: {
            status: executionStatus,
            checklistMenuPackage,
            checklistDigitalSignage,
            checklistFoodCards,
            checklistNotes: checklistNotes || undefined,
            backupReady,
            backupUsed,
            backupNotes: backupNotes || undefined,
            itemExecution: Object.entries(itemExecution).map(([id, item]) => ({
              id,
              isReadyForService: item.isReadyForService,
              wasUsed: item.wasUsed,
              notes: item.notes || undefined,
            })),
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to save execution updates");
      }

      const updated = await response.json();
      setPacket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save execution updates");
    } finally {
      setSavingExecution(false);
    }
  }

  async function handleDeletePacket() {
    if (!packet) return;
    const shouldDelete = window.confirm("Delete this packet and all items?");
    if (!shouldDelete) return;

    const response = await fetch(`/api/packets/${packet.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push("/packets");
      router.refresh();
    }
  }

  if (loading || !packet) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{packet.location.name}</h1>
          <p className="text-sm text-gray-500">
            {formatDate(packet.date)} · {packet.meal}
          </p>
        </div>
        <Badge className={statusBadge[packet.status] ?? "bg-gray-100 text-gray-700"}>
          {packet.status.replace("_", " ")}
        </Badge>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardTitle>Summary</CardTitle>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Items</p>
            <p className="font-medium text-gray-900">{packet.items.length}</p>
          </div>
          <div>
            <p className="text-gray-500">Back-Up Ready</p>
            <p className="font-medium text-gray-900">{backupReady ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-gray-500">Menu Package</p>
            <p className="font-medium text-gray-900">
              {checklistMenuPackage ? "Checked" : "Missing"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Food Cards</p>
            <p className="font-medium text-gray-900">
              {checklistFoodCards ? "Checked" : "Missing"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Packet Structure</CardTitle>
        {!canManageStructure && (
          <p className="mt-2 text-sm text-gray-500">
            You have read-only access to packet structure.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Input
            id="packet-structure-date"
            label="Date"
            type="date"
            value={structureDate}
            onChange={(e) => setStructureDate(e.target.value)}
            disabled={!canManageStructure}
          />
          <Select
            id="packet-structure-meal"
            label="Meal"
            value={structureMeal}
            onChange={(e) => setStructureMeal(e.target.value)}
            options={[
              { value: "Breakfast", label: "Breakfast" },
              { value: "Lunch", label: "Lunch" },
              { value: "Dinner", label: "Dinner" },
            ]}
            disabled={!canManageStructure}
          />
          <Input
            id="packet-structure-market"
            label="Market"
            value={structureMarket}
            onChange={(e) => setStructureMarket(e.target.value)}
            disabled={!canManageStructure}
          />
          <Input
            id="packet-structure-cafe"
            label="Cafe Label"
            value={structureCafe}
            onChange={(e) => setStructureCafe(e.target.value)}
            disabled={!canManageStructure}
          />
        </div>

        <div className="mt-4 space-y-3">
          {structureItems.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-800">Item #{index + 1}</p>
                {canManageStructure && structureItems.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeStructureItem(index)}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  id={`structure-category-${index}`}
                  label="Category"
                  value={item.category}
                  onChange={(e) =>
                    updateStructureItem(index, {
                      category: e.target.value as PacketItemForm["category"],
                    })
                  }
                  options={MENU_PACKET_CATEGORY_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  disabled={!canManageStructure}
                />
                <Input
                  id={`structure-name-${index}`}
                  label="Item Name"
                  value={item.itemName}
                  onChange={(e) => updateStructureItem(index, { itemName: e.target.value })}
                  disabled={!canManageStructure}
                />
                <Input
                  id={`structure-theme-${index}`}
                  label="Theme"
                  value={item.theme}
                  onChange={(e) => updateStructureItem(index, { theme: e.target.value })}
                  disabled={!canManageStructure}
                />
                <Input
                  id={`structure-diets-${index}`}
                  label="Diet Tags"
                  value={item.dietTags}
                  onChange={(e) => updateStructureItem(index, { dietTags: e.target.value })}
                  disabled={!canManageStructure}
                />
                <Input
                  id={`structure-allergens-${index}`}
                  label="Allergens"
                  value={item.allergenTags}
                  onChange={(e) => updateStructureItem(index, { allergenTags: e.target.value })}
                  disabled={!canManageStructure}
                />
              </div>
              <div className="mt-3">
                <Input
                  id={`structure-ingredients-${index}`}
                  label="Ingredients"
                  value={item.ingredients}
                  onChange={(e) => updateStructureItem(index, { ingredients: e.target.value })}
                  disabled={!canManageStructure}
                />
              </div>
            </div>
          ))}
        </div>

        {canManageStructure && (
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={addStructureItem}>
              + Add Item
            </Button>
            <Button onClick={saveStructure} disabled={savingStructure}>
              {savingStructure ? "Saving..." : "Save Structure"}
            </Button>
            <Button variant="danger" onClick={handleDeletePacket}>
              Delete Packet
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Execution Checklist</CardTitle>
        {!canExecute && (
          <p className="mt-2 text-sm text-gray-500">
            You have read-only access to execution updates.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Select
            id="execution-status"
            label="Status"
            value={executionStatus}
            onChange={(e) => setExecutionStatus(e.target.value)}
            options={[
              { value: "draft", label: "Draft" },
              { value: "ready", label: "Ready" },
              { value: "in_service", label: "In Service" },
              { value: "completed", label: "Completed" },
            ]}
            disabled={!canExecute}
          />
          <Input
            id="execution-checklist-notes"
            label="Checklist Notes"
            value={checklistNotes}
            onChange={(e) => setChecklistNotes(e.target.value)}
            disabled={!canExecute}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              label: "Menu package reviewed",
              checked: checklistMenuPackage,
              setChecked: setChecklistMenuPackage,
            },
            {
              label: "Digital signage checked",
              checked: checklistDigitalSignage,
              setChecked: setChecklistDigitalSignage,
            },
            {
              label: "Food cards checked",
              checked: checklistFoodCards,
              setChecked: setChecklistFoodCards,
            },
            {
              label: "Back-Up ready before service",
              checked: backupReady,
              setChecked: setBackupReady,
            },
            {
              label: "Back-Up was used",
              checked: backupUsed,
              setChecked: setBackupUsed,
            },
          ].map((entry) => (
            <label key={entry.label} className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={entry.checked}
                onChange={(e) => entry.setChecked(e.target.checked)}
                disabled={!canExecute}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{entry.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <Input
            id="execution-backup-notes"
            label="Back-Up Notes"
            value={backupNotes}
            onChange={(e) => setBackupNotes(e.target.value)}
            disabled={!canExecute}
            placeholder="Readiness/use details for back-up items"
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">Back-Up Items</p>
          {backUpItems.length === 0 ? (
            <p className="text-sm text-gray-500">No Back-Up items in this packet.</p>
          ) : (
            backUpItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                <p className="font-medium text-sm text-gray-900">{item.itemName}</p>
                <p className="text-xs text-gray-500 mb-2">{item.ingredients}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itemExecution[item.id]?.isReadyForService ?? false}
                      onChange={(e) =>
                        setItemExecution((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...(prev[item.id] ?? {
                              isReadyForService: false,
                              wasUsed: false,
                              notes: "",
                            }),
                            isReadyForService: e.target.checked,
                          },
                        }))
                      }
                      disabled={!canExecute}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Ready
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itemExecution[item.id]?.wasUsed ?? false}
                      onChange={(e) =>
                        setItemExecution((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...(prev[item.id] ?? {
                              isReadyForService: false,
                              wasUsed: false,
                              notes: "",
                            }),
                            wasUsed: e.target.checked,
                          },
                        }))
                      }
                      disabled={!canExecute}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Used
                  </label>
                </div>
                <div className="mt-2">
                  <Input
                    id={`backup-item-notes-${item.id}`}
                    label="Notes"
                    value={itemExecution[item.id]?.notes ?? ""}
                    onChange={(e) =>
                      setItemExecution((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...(prev[item.id] ?? {
                            isReadyForService: false,
                            wasUsed: false,
                            notes: "",
                          }),
                          notes: e.target.value,
                        },
                      }))
                    }
                    disabled={!canExecute}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {canExecute && (
          <div className="mt-4">
            <Button onClick={saveExecution} disabled={savingExecution}>
              {savingExecution ? "Saving..." : "Save Execution Updates"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
