"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  publishedAt?: string | null;
  readyForFinalReviewAt?: string | null;
  finalizedForServiceAt?: string | null;
  publishedBy?: { id: string; name: string } | null;
  readyForFinalReviewBy?: { id: string; name: string } | null;
  finalizedForServiceBy?: { id: string; name: string } | null;
  reviewSignatures: {
    id: string;
    signerNameInput: string;
    signerRole: string;
    createdAt: string;
    signer: { id: string; name: string; email: string; role: string };
  }[];
  items: PacketItem[];
}

interface PacketItemForm {
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
  ready: "bg-blue-100 text-blue-700",
  in_service: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
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

function mapToStructureItem(item: PacketItem): PacketItemForm {
  return {
    category: item.category,
    itemName: item.itemName,
    ingredients: item.ingredients,
    dietTags: item.dietTags,
    allergenTags: item.allergenTags,
    sortOrder: item.sortOrder,
  };
}

function emptyStructureItem(sortOrder: number): PacketItemForm {
  return {
    category: "entree",
    itemName: "",
    ingredients: "",
    dietTags: [],
    allergenTags: [],
    sortOrder,
  };
}

export default function MenuSignageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAsKitchenAdminId = searchParams.get("viewAsKitchenAdminId") ?? "";
  const { data: session } = useSession();

  const [packet, setPacket] = useState<PacketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingStructure, setSavingStructure] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [runningWorkflowAction, setRunningWorkflowAction] = useState<string | null>(null);

  const [structureDate, setStructureDate] = useState("");
  const [structureMeal, setStructureMeal] = useState("");
  const [structureTheme, setStructureTheme] = useState("");
  const [structureItems, setStructureItems] = useState<PacketItemForm[]>([]);

  const [signatureName, setSignatureName] = useState("");
  const [signatureAcknowledged, setSignatureAcknowledged] = useState(false);

  const permissionKeys =
    (session?.user as unknown as { permissionKeys?: string[] } | undefined)?.permissionKeys ?? [];
  const canManageStructure =
    permissionKeys.includes("packets.manage_structure") ||
    permissionKeys.includes("packets.override");
  const canExecute =
    permissionKeys.includes("packets.execute") || permissionKeys.includes("packets.override");
  const canPublish =
    permissionKeys.includes("packets.publish") || permissionKeys.includes("packets.override");
  const canFinalizeService =
    permissionKeys.includes("packets.finalize_service") ||
    permissionKeys.includes("packets.override");

  const canReviewerEdit =
    canExecute && (packet?.status === "published" || packet?.status === "for_final_review");
  const canEditPacket = canManageStructure || canReviewerEdit;
  const signatureCount = packet?.reviewSignatures.length ?? 0;

  async function loadPacket() {
    setLoading(true);
    setError("");

    try {
      const paramsValue = new URLSearchParams();
      if (viewAsKitchenAdminId) paramsValue.set("viewAsKitchenAdminId", viewAsKitchenAdminId);
      const query = paramsValue.toString();
      const response = await fetch(`/api/packets/${params.id}${query ? `?${query}` : ""}`);
      const data = await response.json();
      if (!response.ok || !data?.id) {
        throw new Error(data?.error ?? "Failed to load menu");
      }

      setPacket(data);
      setStructureDate(new Date(data.date).toISOString().split("T")[0]);
      setStructureMeal(data.meal);
      setStructureTheme(data.theme ?? "");
      setStructureItems(data.items.map(mapToStructureItem));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPacket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, viewAsKitchenAdminId]);

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

  function toggleAllergen(index: number, tag: string) {
    setStructureItems((prev) =>
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

  async function patchPacket(body: Record<string, unknown>) {
    if (!packet) return null;

    const payload: Record<string, unknown> = { ...body };
    if (viewAsKitchenAdminId) {
      payload.viewAsKitchenAdminId = viewAsKitchenAdminId;
    }

    const response = await fetch(`/api/packets/${packet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = await response.json();
    if (!response.ok) {
      throw new Error(parsed.error ?? "Failed to update menu");
    }

    setPacket(parsed);
    return parsed;
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
            theme: structureTheme || undefined,
            items: structureItems.map((item, index) => ({
              category: item.category,
              itemName: item.itemName,
              ingredients: item.ingredients,
              dietTags: item.dietTags,
              allergenTags: item.allergenTags,
              sortOrder: index,
            })),
          },
          viewAsKitchenAdminId: viewAsKitchenAdminId || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to save menu setup");
      }

      const updated = await response.json();
      setPacket(updated);
      toast.success("Menu setup saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save menu setup");
    } finally {
      setSavingStructure(false);
    }
  }

  async function publishPacket() {
    if (!packet) return;
    setRunningWorkflowAction("publish");
    setError("");
    try {
      await patchPacket({ mode: "publish", data: { note: "Sent for team review." } });
      toast.success("Menu sent for review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send for review");
    } finally {
      setRunningWorkflowAction(null);
    }
  }

  async function sendForFinalReview() {
    if (!packet) return;
    setRunningWorkflowAction("final_review");
    setError("");
    try {
      await patchPacket({
        mode: "submit_for_final_review",
        data: { note: "Marked as reviewed." },
      });
      toast.success("Menu marked as reviewed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as reviewed");
    } finally {
      setRunningWorkflowAction(null);
    }
  }

  async function addSignature() {
    if (!packet) return;
    setSavingSignature(true);
    setError("");

    try {
      await patchPacket({
        mode: "add_signature",
        data: {
          typedName: signatureName,
          acknowledged: signatureAcknowledged,
        },
      });
      setSignatureName("");
      setSignatureAcknowledged(false);
      toast.success("Signature added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add signature");
    } finally {
      setSavingSignature(false);
    }
  }

  async function finalizeForService() {
    if (!packet) return;
    setRunningWorkflowAction("finalize");
    setError("");

    try {
      await patchPacket({
        mode: "finalize_for_service",
        data: {
          typedName: signatureName,
          acknowledged: signatureAcknowledged,
          note: "Approved for service.",
        },
      });
      setSignatureName("");
      setSignatureAcknowledged(false);
      toast.success("Menu approved for service");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve menu");
    } finally {
      setRunningWorkflowAction(null);
    }
  }

  async function handleDeletePacket() {
    if (!packet) return;
    const shouldDelete = window.confirm("Delete this menu and all items?");
    if (!shouldDelete) return;

    const query = viewAsKitchenAdminId
      ? `?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
      : "";
    const response = await fetch(`/api/packets/${packet.id}${query}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push(
        viewAsKitchenAdminId
          ? `/menu-signage?viewAsKitchenAdminId=${encodeURIComponent(viewAsKitchenAdminId)}`
          : "/menu-signage"
      );
      router.refresh();
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
          </p>
          <div className="mt-2">
            <WorkflowStepIndicator currentStatus={packet.status} />
          </div>
        </div>
        <Badge className={statusBadge[packet.status] ?? "bg-gray-100 text-gray-700"}>
          {STATUS_DISPLAY_LABEL[packet.status] ?? packet.status.replace("_", " ")}
        </Badge>
      </div>

      {viewAsKitchenAdminId && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Focused support view is active. Actions remain logged under your account and role.
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardTitle>Summary</CardTitle>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Items</p>
            <p className="font-medium text-foreground">{packet.items.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Theme</p>
            <p className="font-medium text-foreground">{packet.theme ?? "--"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Signatures</p>
            <p className="font-medium text-foreground">{signatureCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Review Status</p>
            <p className="font-medium text-foreground">
              {packet.status === "for_final_review"
                ? "Awaiting approval"
                : (STATUS_DISPLAY_LABEL[packet.status] ?? "--")}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Menu Setup</CardTitle>
        {!canEditPacket && (
          <p className="mt-2 text-sm text-muted-foreground">
            You have read-only access to menu setup.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <Input
            id="packet-structure-date"
            label="Date"
            type="date"
            value={structureDate}
            onChange={(e) => setStructureDate(e.target.value)}
            disabled={!canEditPacket}
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
            disabled={!canEditPacket}
          />
          <Input
            id="packet-structure-theme"
            label="Theme"
            value={structureTheme}
            onChange={(e) => setStructureTheme(e.target.value)}
            disabled={!canEditPacket}
          />
        </div>

        <div className="mt-4 space-y-3">
          {structureItems.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Item #{index + 1}</p>
                {canEditPacket && structureItems.length > 1 && (
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
                  disabled={!canEditPacket}
                />
                <Input
                  id={`structure-name-${index}`}
                  label="Item Name"
                  value={item.itemName}
                  onChange={(e) => updateStructureItem(index, { itemName: e.target.value })}
                  disabled={!canEditPacket}
                />
              </div>
              <div className="mt-3">
                <Textarea
                  id={`structure-ingredients-${index}`}
                  label="Ingredients"
                  value={item.ingredients}
                  onChange={(e) => updateStructureItem(index, { ingredients: e.target.value })}
                  disabled={!canEditPacket}
                />
              </div>

              <div className="mt-3">
                <Select
                  id={`structure-diet-${index}`}
                  label="Diet Tag"
                  value={item.dietTags[0] ?? ""}
                  onChange={(e) =>
                    updateStructureItem(index, {
                      dietTags: e.target.value ? [e.target.value] : [],
                    })
                  }
                  options={MENU_PACKET_DIET_TAG_OPTIONS.map((tag) => ({
                    value: tag,
                    label: tag,
                  }))}
                  placeholder="None"
                  disabled={!canEditPacket}
                />
              </div>

              <div className="mt-3 space-y-2">
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
                        disabled={!canEditPacket}
                      >
                        {tag}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {canEditPacket && (
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={addStructureItem}>
              + Add Item
            </Button>
            <Button onClick={saveStructure} disabled={savingStructure}>
              {savingStructure ? "Saving..." : "Save Menu Setup"}
            </Button>
            <Button variant="danger" onClick={handleDeletePacket} disabled={!canManageStructure}>
              Delete Menu
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Signatures & Workflow ({signatureCount})</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Add signatures as work is reviewed. Two signatures are required before approval.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="signature-name"
            label="Type your name"
            value={signatureName}
            onChange={(event) => setSignatureName(event.target.value)}
            placeholder="Name used for this signature"
          />
          <label className="flex items-center gap-2 text-sm text-foreground mt-6">
            <input
              type="checkbox"
              checked={signatureAcknowledged}
              onChange={(event) => setSignatureAcknowledged(event.target.checked)}
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
            {savingSignature ? "Signing..." : "Add Signature"}
          </Button>
          <Button
            variant="secondary"
            onClick={publishPacket}
            disabled={
              runningWorkflowAction === "publish" || !canPublish || packet.status !== "draft"
            }
          >
            {runningWorkflowAction === "publish" ? "Sending..." : "Send for Review"}
          </Button>
          <Button
            variant="secondary"
            onClick={sendForFinalReview}
            disabled={
              runningWorkflowAction === "final_review" ||
              !(canExecute || canManageStructure) ||
              !["published", "for_final_review"].includes(packet.status)
            }
          >
            {runningWorkflowAction === "final_review" ? "Sending..." : "Mark as Reviewed"}
          </Button>
          <Button
            onClick={finalizeForService}
            disabled={
              runningWorkflowAction === "finalize" ||
              !canFinalizeService ||
              packet.status !== "for_final_review" ||
              !signatureName.trim() ||
              !signatureAcknowledged
            }
          >
            {runningWorkflowAction === "finalize" ? "Approving..." : "Approve for Service"}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {packet.reviewSignatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signatures recorded yet.</p>
          ) : (
            packet.reviewSignatures.map((signature) => (
              <div key={signature.id} className="rounded-lg border border-border p-3 bg-muted/40">
                <p className="text-sm font-medium text-foreground">{signature.signerNameInput}</p>
                <p className="text-xs text-muted-foreground">
                  Signed by {signature.signer.name} ({signature.signer.role.replaceAll("_", " ")})
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(signature.createdAt)}
                </p>
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
    </div>
  );
}
