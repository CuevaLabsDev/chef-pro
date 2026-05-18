"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  FileWarning,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditListItem {
  id: string;
  type: string;
  auditDate: string;
  status: string;
  summary: string | null;
  needsHumanReview: boolean;
  location: { name: string };
  submittedBy: { name: string };
  _count: { issues: number; assets: number; closingPhotos: number };
  temperatureLog: { _count: { entries: number } } | null;
}

interface AuditDetail extends Omit<AuditListItem, "temperatureLog"> {
  assets: Array<{ id: string; fileName: string; kind: string; fileType: string }>;
  issues: Array<{
    id: string;
    severity: string;
    status: string;
    title: string;
    description: string;
  }>;
  temperatureLog: {
    generatedPdfAssetId: string | null;
    entries: Array<{
      id: string;
      stationName: string | null;
      itemName: string | null;
      holdingType: string;
      temperatureF: number | null;
      complianceStatus: string;
      confidence: number;
    }>;
  } | null;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

export default function OpsCompliancePage() {
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [selected, setSelected] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [aiStats, setAiStats] = useState<{ total: number; blocked: number } | null>(null);

  const loadAudits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operational-audits?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load audits");
      setAudits(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load audits");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  async function loadDetail(id: string) {
    try {
      const res = await fetch(`/api/operational-audits/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load audit");
      setSelected(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load audit");
    }
  }

  async function openAsset(assetId: string) {
    try {
      const res = await fetch(`/api/operational-audits/assets/${assetId}/signed-url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to open asset");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to open asset");
    }
  }

  async function reanalyze() {
    if (!selected) return;
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/operational-audits/${selected.id}/reanalyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reanalysis failed");
      toast.success("Reanalysis started and saved");
      setSelected(data);
      await loadAudits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reanalysis failed");
    } finally {
      setReanalyzing(false);
    }
  }

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  useEffect(() => {
    fetch("/api/ai/shield")
      .then((r) => r.json())
      .then((d) => setAiStats(d))
      .catch(() => null);
  }, []);

  const openIssues = audits.reduce((sum, audit) => sum + audit._count.issues, 0);
  const needingReview = audits.filter((audit) => audit.needsHumanReview).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compliance Audits</h1>
            <p className="text-sm text-muted-foreground">
              AI-assisted potential issues requiring manager review.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Audits</p>
            <p className="text-2xl font-bold">{audits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Needs review</p>
            <p className="text-2xl font-bold">{needingReview}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Potential issues</p>
            <p className="text-2xl font-bold">{openIssues}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">AI Governance</p>
            </div>
            <p className="text-2xl font-bold">{aiStats?.total ?? "—"}</p>
            {aiStats && aiStats.blocked > 0 && (
              <p className="text-xs text-destructive">{aiStats.blocked} blocked</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <Button variant="secondary" onClick={loadAudits} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow
                    key={audit.id}
                    className="cursor-pointer"
                    onClick={() => loadDetail(audit.id)}
                  >
                    <TableCell>{new Date(audit.auditDate).toISOString().split("T")[0]}</TableCell>
                    <TableCell>{audit.location.name}</TableCell>
                    <TableCell>{audit.type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{audit.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{audit._count.issues}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!loading && audits.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-8 text-sm text-muted-foreground">
                <FileWarning />
                No audits for this range
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Audit Detail</CardTitle>
              {selected && (
                <Button size="sm" variant="outline" onClick={reanalyze} disabled={reanalyzing}>
                  {reanalyzing ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  Reanalyze
                </Button>
              )}
            </div>
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select an audit to inspect evidence and extracted entries.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {selected.summary ?? "No summary available."}
                </p>
                <div className="flex flex-col gap-2">
                  {selected.assets.map((asset) => (
                    <Button
                      key={asset.id}
                      variant="outline"
                      size="sm"
                      onClick={() => openAsset(asset.id)}
                    >
                      <ExternalLink />
                      {asset.kind === "generated_pdf" ? "Archive PDF" : asset.fileName}
                    </Button>
                  ))}
                </div>
                {selected.temperatureLog && (
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-sm">Temperature entries</CardTitle>
                    {selected.temperatureLog.entries.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="rounded-md border p-2 text-sm">
                        <div className="font-medium">
                          {entry.stationName ?? entry.itemName ?? "Unknown item"}
                        </div>
                        <div className="text-muted-foreground">
                          {entry.holdingType} · {entry.temperatureF ?? "-"}F ·{" "}
                          {entry.complianceStatus}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-sm">Potential issues</CardTitle>
                  {selected.issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No AI-assisted potential issues recorded.
                    </p>
                  ) : (
                    selected.issues.map((issue) => (
                      <div key={issue.id} className="rounded-md border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{issue.title}</span>
                          <Badge variant="secondary">{issue.severity}</Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">{issue.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
