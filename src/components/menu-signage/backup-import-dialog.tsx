"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PacketItem {
  id: string;
  itemName: string;
  ingredients: string;
  category: string;
  dietTags: string[];
  allergenTags: string[];
}

interface Packet {
  id: string;
  date: string;
  meal: string;
  theme?: string | null;
  location: { id: string; name: string };
  items: PacketItem[];
}

interface BackupImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (item: {
    itemName: string;
    ingredients: string;
    dietTags: string[];
    allergenTags: string[];
  }) => void;
  currentDate: string;
}

function previousDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function BackupImportDialog({
  open,
  onClose,
  onImport,
  currentDate,
}: BackupImportDialogProps) {
  const [browseDate, setBrowseDate] = useState(() => previousDay(currentDate));
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPacketId, setExpandedPacketId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    params.set("dateFrom", browseDate);
    params.set("dateTo", browseDate);

    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/packets?${params.toString()}`);
        const data = await r.json();
        setPackets(Array.isArray(data) ? data : []);
      } catch {
        setPackets([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, browseDate]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Previous Menu</DialogTitle>
          <DialogDescription>
            Browse menus from previous days and import an item into your backup slot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBrowseDate(previousDay(browseDate))}
          >
            ← Prev
          </Button>
          <Input
            id="backup-browse-date"
            type="date"
            value={browseDate}
            onChange={(e) => setBrowseDate(e.target.value)}
            className="flex-1"
          />
          <Button variant="secondary" size="sm" onClick={() => setBrowseDate(nextDay(browseDate))}>
            Next →
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">Showing menus for {formatDate(browseDate)}</p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : packets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No menus found for this date.
          </p>
        ) : (
          <div className="space-y-3">
            {packets.map((packet) => (
              <div key={packet.id} className="rounded-lg border border-border">
                <button
                  onClick={() =>
                    setExpandedPacketId(expandedPacketId === packet.id ? null : packet.id)
                  }
                  className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {packet.location.name} · {packet.meal}
                    </p>
                    {packet.theme && (
                      <p className="text-xs text-muted-foreground">{packet.theme}</p>
                    )}
                  </div>
                  <Badge className="bg-muted text-muted-foreground">
                    {packet.items.length} items
                  </Badge>
                </button>

                {expandedPacketId === packet.id && (
                  <div className="border-t border-border px-3 py-2 space-y-2">
                    {packet.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-md bg-muted/30 p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.itemName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.ingredients || "No ingredients listed"}
                          </p>
                          {item.dietTags.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Diet: {item.dietTags.join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            onImport({
                              itemName: item.itemName,
                              ingredients: item.ingredients,
                              dietTags: item.dietTags,
                              allergenTags: item.allergenTags,
                            })
                          }
                        >
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
