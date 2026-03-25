"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MENU_PACKET_ALLERGEN_OPTIONS,
  MENU_PACKET_CATEGORY_OPTIONS,
  MENU_PACKET_DIET_TAG_OPTIONS,
  STATUS_DISPLAY_LABEL,
} from "@/modules/menu-signage/types";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { BackupImportDialog } from "@/components/menu-signage/backup-import-dialog";

interface PacketItem {
  id: string;
  category: (typeof MENU_PACKET_CATEGORY_OPTIONS)[number]["value"];
  itemName: string;
  ingredients: string;
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
  theme?: string | null;
  status: string;
  locationId: string;
  location: { id: string; name: string };
  reviewSignatures: {
    id: string;
    signerNameInput: string;
    signerRole: string;
    createdAt: string;
    signer: { id: string; name: string; email: string; role: string };
  }[];
  items: PacketItem[];
}

interface ItemForm {
  category: PacketItem["category"];
  itemName: string;
  ingredients: string;
  dietTags: string[];
  allergenTags: string[];
  sortOrder: number;
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-blue-100 text-blue-700",
  for_final_review: "bg-amber-100 text-amber-700",
  finalized_for_service: "bg-green-100 text-green-700",
};

const WORKFLOW_STEPS = [
  { key: "draft", label: "Building" },
  { key: "published", label: "Ready for Review" },
  { key: "for_final_review", label: "In Review" },
  { key: "finalized_for_service", label: "Approved" },
];

function WorkflowStepIndicator({ currentStatus }: { currentStatus: string }) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.key === currentStatus);
  return (
    <div className="flex items-center gap-1 text-xs">
      {WORKFLOW_STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={
                isActive
                  ? "font-semibold text-primary"
                  : isComplete
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function mapToForm(item: PacketItem): ItemForm {
  return {
    category: item.category,
    itemName: item.itemName,
    ingredients: item.ingredients,
    dietTags: item.dietTags,
    allergenTags: item.allergenTags,
    sortOrder: item.sortOrder,
  };
}

function emptyItem(sortOrder: number): ItemForm {
  return {
    category: "entree",
    itemName: "",
    ingredients: "",
    dietTags: [],
    allergenTags: [],
    sortOrder,
  };
}

export default function ReviewPage() {
  const params = useParams();
  const { data: session } = useSession();

  const [packet, setPacket] = useState<PacketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [runningWorkflowAction, setRunningWorkflowAction] = useState<string | null>(null);

  const [items, setItems] = useState<ItemForm[]>([]);
  const [signatureName, setSignatureName] = useState("");
  const [signatureAcknowledged, setSignatureAcknowledged] = useState(false);
  const [backupImportIndex, setBackupImportIndex] = useState<number | null>(null);

  const permissionKeys =
    (session?.user as unknown as { permissionKeys?: string[] } | undefined)?.permissionKeys ?? [];
  const canExecute =
    permissionKeys.includes("packets.execute") || permissionKeys.includes("packets.override");
  const canManageStructure =
    permissionKeys.includes("packets.manage_structure") ||
    permissionKeys.includes("packets.override");

  const canEdit =
    (canExecute || canManageStructure) &&
    (packet?.status === "published" || packet?.status === "for_final_review");

  const signatureCount = packet?.reviewSignatures.length ?? 0;

  async function loadPacket() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/packets/${params.id}`);
      const data = await response.json();
      if (!response.ok || !data?.id) {
        throw new Error(data?.error ?? "Failed to load menu");
      }
      setPacket(data);
      setItems(data.items.map(mapToForm));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPacket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function updateItem(index: number, partial: Partial<ItemForm>) {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem(prev.length)]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, sortOrder: idx }))
    );
  }

  function toggleAllergen(index: number, tag: string) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              allergenTags: item.allergenTags.includes(tag)
                ? item.allergenTags.filter((entry) => entry !== tag)
                : [...item.allergenTags, tag],
            }
          : item
      )
    );
  }

  function handleImport(
    index: number,
    imported: { itemName: string; ingredients: string; dietTags: string[]; allergenTags: string[] }
  ) {
    updateItem(index, {
      itemName: imported.itemName,
      ingredients: imported.ingredients,
      dietTags: imported.dietTags,
      allergenTags: imported.allergenTags,
    });
    setBackupImportIndex(null);
  }

  async function saveChanges() {
    if (!packet) return;
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`/api/packets/${packet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "structure",
          data: {
            items: items.map((item, index) => ({
              category: item.category,
              itemName: item.itemName,
              ingredients: item.ingredients,
              dietTags: item.dietTags,
              allergenTags: item.allergenTags,
              sortOrder: index,
            })),
          },
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to save changes");
      }
      const updated = await response.json();
      setPacket(updated);
      setItems(updated.items.map(mapToForm));
      toast.success("Changes saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function addSignature() {
    if (!packet) return;
    setSavingSignature(true);
    setError("");

    try {
      const response = await fetch(`/api/packets/${packet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "add_signature",
          data: {
            typedName: signatureName,
            acknowledged: signatureAcknowledged,
          },
        }),
      });
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error ?? "Failed to add signature");
      setPacket(parsed);
      setSignatureName("");
      setSignatureAcknowledged(false);
      toast.success("Signature added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add signature");
    } finally {
      setSavingSignature(false);
    }
  }

  async function markAsReviewed() {
    if (!packet) return;
    setRunningWorkflowAction("final_review");
    setError("");
    try {
      const response = await fetch(`/api/packets/${packet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "submit_for_final_review",
          data: { note: "Marked as reviewed." },
        }),
      });
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error ?? "Failed to mark as reviewed");
      setPacket(parsed);
      toast.success("Menu marked as reviewed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as reviewed");
    } finally {
      setRunningWorkflowAction(null);
    }
  }

  if (loading || !packet) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{packet.location.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(packet.date)} · {packet.meal}
            {packet.theme ? ` · ${packet.theme}` : ""}
          </p>
          <div className="mt-2">
            <WorkflowStepIndicator currentStatus={packet.status} />
          </div>
        </div>
        <Badge className={statusBadge[packet.status] ?? "bg-gray-100 text-gray-700"}>
          {STATUS_DISPLAY_LABEL[packet.status] ?? packet.status.replace("_", " ")}
        </Badge>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          This menu is view-only. Editing is available when the status is &quot;Ready for
          Review&quot; or &quot;In Review&quot;.
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Items ({items.length})</h2>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={addItem}>
              + Add Item
            </Button>
          )}
        </div>

        {items.map((item, index) => (
          <Card key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Item #{index + 1}</p>
              {canEdit && items.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                id={`review-category-${index}`}
                label="Category"
                value={item.category}
                onChange={(e) =>
                  updateItem(index, {
                    category: e.target.value as ItemForm["category"],
                  })
                }
                options={MENU_PACKET_CATEGORY_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                disabled={!canEdit}
              />
              <Input
                id={`review-name-${index}`}
                label="Item Name"
                value={item.itemName}
                onChange={(e) => updateItem(index, { itemName: e.target.value })}
                disabled={!canEdit}
              />
            </div>

            <Textarea
              id={`review-ingredients-${index}`}
              label="Ingredients"
              value={item.ingredients}
              onChange={(e) => updateItem(index, { ingredients: e.target.value })}
              disabled={!canEdit}
            />

            <Select
              id={`review-diet-${index}`}
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
              disabled={!canEdit}
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
                      disabled={!canEdit}
                    >
                      {tag}
                    </Button>
                  );
                })}
              </div>
            </div>

            {item.category === "back_up" && canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setBackupImportIndex(index)}>
                Import from Previous
              </Button>
            )}
          </Card>
        ))}

        {canEdit && (
          <Button onClick={saveChanges} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <Card>
        <CardTitle>Signature ({signatureCount})</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign to confirm your review. Two signatures are required before approval.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="review-signature-name"
            label="Type your name"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Name used for this signature"
          />
          <label className="flex items-center gap-2 text-sm text-foreground mt-6">
            <input
              type="checkbox"
              checked={signatureAcknowledged}
              onChange={(e) => setSignatureAcknowledged(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            I confirm this signature for menu review.
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={addSignature}
            disabled={savingSignature || !signatureName.trim() || !signatureAcknowledged}
          >
            {savingSignature ? "Signing..." : "Sign and Confirm"}
          </Button>
          {canEdit && ["published", "for_final_review"].includes(packet.status) && (
            <Button
              variant="secondary"
              onClick={markAsReviewed}
              disabled={runningWorkflowAction === "final_review"}
            >
              {runningWorkflowAction === "final_review" ? "Sending..." : "Mark as Reviewed"}
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {packet.reviewSignatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signatures yet.</p>
          ) : (
            packet.reviewSignatures.map((sig) => (
              <div key={sig.id} className="rounded-lg border border-border p-3 bg-muted/40">
                <p className="text-sm font-medium text-foreground">{sig.signerNameInput}</p>
                <p className="text-xs text-muted-foreground">
                  {sig.signer.name} ({sig.signer.role.replaceAll("_", " ")})
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(sig.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="flex justify-center">
        <Link
          href={`/menu-signage/${packet.id}/changes`}
          className="text-sm text-primary hover:underline"
        >
          Review Changes →
        </Link>
      </div>

      {backupImportIndex !== null && (
        <BackupImportDialog
          open={true}
          onClose={() => setBackupImportIndex(null)}
          onImport={(imported) => handleImport(backupImportIndex, imported)}
          currentDate={packet.date}
        />
      )}
    </div>
  );
}
