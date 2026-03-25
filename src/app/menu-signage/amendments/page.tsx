"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface Amendment {
  id: string;
  packetId: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  requestedBy: { name: string };
  resolvedBy?: { name: string } | null;
  item: { itemName: string; category: string } | null;
  packet: { id: string; meal: string; date: string; location: { name: string } };
}

const TYPE_LABELS: Record<string, string> = {
  item_change: "Dish update",
  backup_swap: "Backup swap",
  item_removed: "Dish removed",
  item_added: "Dish added",
};

const REASON_LABELS: Record<string, string> = {
  tasting_feedback: "From tasting",
  prep_change: "During prep",
  service_change: "During service",
  correction: "Correction",
};

function statusBadge(status: string) {
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-800">Waiting</Badge>;
  if (status === "applied") return <Badge className="bg-green-100 text-green-800">Done</Badge>;
  return <Badge className="bg-muted text-muted-foreground">Skipped</Badge>;
}

export default function AmendmentsQueuePage() {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  function load() {
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/packets/amendments?dateFrom=${today}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAmendments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(amendmentId: string, packetId: string, status: "applied" | "dismissed") {
    setResolving(amendmentId);
    await fetch(`/api/packets/${packetId}/amendments/${amendmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setResolving(null);
    load();
  }

  const pending = amendments.filter((a) => a.status === "pending");
  const resolved = amendments.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sign Changes</h1>
        <p className="text-sm text-muted-foreground">
          Review requests from chefs and update Food Cards / EATS accordingly
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : pending.length === 0 && resolved.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No sign changes requested today. All clear!</p>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Needs Your Attention ({pending.length})</h2>
              {pending.map((a) => (
                <Card key={a.id} className="p-4 border-amber-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.packet.location.name}</span>
                        <span className="text-muted-foreground">&middot;</span>
                        <span className="text-muted-foreground">{a.packet.meal}</span>
                        {statusBadge(a.status)}
                      </div>
                      <p className="mt-1 text-sm">{a.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{TYPE_LABELS[a.type] ?? a.type}</span>
                        <span>&middot;</span>
                        <span>{REASON_LABELS[a.reason] ?? a.reason}</span>
                        <span>&middot;</span>
                        <span>from {a.requestedBy.name}</span>
                        {a.item && (
                          <>
                            <span>&middot;</span>
                            <span>{a.item.itemName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolving === a.id}
                        onClick={() => resolve(a.id, a.packetId, "dismissed")}
                      >
                        <XCircle className="size-4 mr-1" /> Skip
                      </Button>
                      <Button
                        size="sm"
                        disabled={resolving === a.id}
                        onClick={() => resolve(a.id, a.packetId, "applied")}
                      >
                        <CheckCircle className="size-4 mr-1" /> Done
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Already Handled ({resolved.length})
              </h2>
              {resolved.map((a) => (
                <Card key={a.id} className="p-4 opacity-70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.packet.location.name}</span>
                        <span className="text-muted-foreground">&middot;</span>
                        <span className="text-muted-foreground">{a.packet.meal}</span>
                        {statusBadge(a.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TYPE_LABELS[a.type] ?? a.type} &middot; from {a.requestedBy.name}
                        {a.resolvedBy && ` · handled by ${a.resolvedBy.name}`}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
