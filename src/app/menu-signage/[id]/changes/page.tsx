"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface AuditEvent {
  id: string;
  action: string;
  actorName: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  packet_created: "Menu Created",
  packet_structure_updated: "Menu Setup Updated",
  packet_execution_updated: "Service Checklist Updated",
  packet_published: "Sent for Review",
  packet_sent_for_final_review: "Marked as Reviewed",
  packet_signature_added: "Signature Added",
  packet_finalized_for_service: "Approved for Service",
  packet_deleted: "Menu Deleted",
};

const actionBadge: Record<string, string> = {
  packet_created: "bg-green-100 text-green-700",
  packet_structure_updated: "bg-blue-100 text-blue-700",
  packet_published: "bg-blue-100 text-blue-700",
  packet_sent_for_final_review: "bg-amber-100 text-amber-700",
  packet_signature_added: "bg-purple-100 text-purple-700",
  packet_finalized_for_service: "bg-green-100 text-green-700",
  packet_deleted: "bg-red-100 text-red-700",
};

function FieldChange({ event }: { event: AuditEvent }) {
  if (!event.fieldName) return null;
  return (
    <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs space-y-1">
      <p className="font-medium text-foreground">{event.fieldName}</p>
      <div className="grid grid-cols-2 gap-2">
        {event.oldValue && (
          <div>
            <p className="text-muted-foreground">Before</p>
            <p className="text-foreground break-words">{event.oldValue}</p>
          </div>
        )}
        {event.newValue && (
          <div>
            <p className="text-muted-foreground">After</p>
            <p className="text-foreground break-words">{event.newValue}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataChanges({ event }: { event: AuditEvent }) {
  const changes = event.metadata?.changes as
    | { fieldName: string; oldValue?: string; newValue?: string }[]
    | undefined;

  if (!changes || changes.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {changes.map((change, i) => (
        <div key={i} className="rounded-md bg-muted/50 p-2 text-xs space-y-1">
          <p className="font-medium text-foreground">{change.fieldName}</p>
          <div className="grid grid-cols-2 gap-2">
            {change.oldValue && (
              <div>
                <p className="text-muted-foreground">Before</p>
                <p className="text-foreground break-words">{change.oldValue}</p>
              </div>
            )}
            {change.newValue && (
              <div>
                <p className="text-muted-foreground">After</p>
                <p className="text-foreground break-words">{change.newValue}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChangesPage() {
  const params = useParams();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/packets/${params.id}/history`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setEvents([]);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Changes</h1>
          <p className="text-sm text-muted-foreground">Detailed change history for this menu.</p>
        </div>
        <Link href={`/menu-signage/${params.id}`} className="text-sm text-primary hover:underline">
          ← Back to Menu
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-muted-foreground">No changes recorded yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={actionBadge[event.action] ?? "bg-muted text-muted-foreground"}
                    >
                      {actionLabels[event.action] ?? event.action.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{event.actorName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>

                  {event.action === "packet_signature_added" && !!event.metadata?.typedName && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Signed as: {String(event.metadata.typedName)}
                    </p>
                  )}

                  {event.action === "packet_published" && !!event.metadata?.note && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Note: {String(event.metadata.note)}
                    </p>
                  )}
                </div>
              </div>

              <FieldChange event={event} />
              <MetadataChanges event={event} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
