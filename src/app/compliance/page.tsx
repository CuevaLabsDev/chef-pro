"use client";

import { useEffect, useState } from "react";
import { Camera, FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilePickField } from "@/components/ui/file-pick-field";
import { Select } from "@/components/ui/select";
import {
  CLOSING_PHOTO_CATEGORIES,
  type ClosingPhotoCategory,
} from "@/modules/operational-compliance/types";

interface LocationOption {
  id: string;
  name: string;
}

interface AuditResult {
  id: string;
  type: string;
  status: string;
  summary: string | null;
  needsHumanReview: boolean;
  issues: Array<{ id: string; severity: string; title: string }>;
}

const CATEGORY_LABELS: Record<ClosingPhotoCategory, string> = {
  station: "Station",
  line: "Line",
  walk_in: "Walk-in",
  dish_area: "Dish area",
  storage: "Storage",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function ComplianceUploadPage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [auditDate, setAuditDate] = useState(today);
  const [closingFiles, setClosingFiles] = useState<Record<string, File | null>>({});
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<"closing" | "temperature" | null>(null);
  const [latest, setLatest] = useState<AuditResult | null>(null);

  useEffect(() => {
    fetch("/api/config/locations")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Unable to load locations");
        }
        const list = Array.isArray(data) ? data : [];
        setLocations(list);
        if (list[0]?.id) setLocationId(list[0].id);
        else setLocationId("");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load locations"));
  }, []);

  async function submitClosing() {
    if (!locationId) return toast.error("Select a location");
    const formData = new FormData();
    formData.set("locationId", locationId);
    formData.set("auditDate", auditDate);
    for (const category of CLOSING_PHOTO_CATEGORIES) {
      const file = closingFiles[category];
      if (file) formData.set(category, file);
    }
    if (!Object.values(closingFiles).some(Boolean)) {
      return toast.error("Add at least one closing photo");
    }

    setSubmitting("closing");
    try {
      const res = await fetch("/api/operational-audits/closing", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLatest(data);
      toast.success("Closing verification saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitTemperatureLog() {
    if (!locationId) return toast.error("Select a location");
    if (!tempFile) return toast.error("Add a temperature log image or PDF");
    const formData = new FormData();
    formData.set("locationId", locationId);
    formData.set("auditDate", auditDate);
    formData.set("file", tempFile);

    setSubmitting("temperature");
    try {
      const res = await fetch("/api/operational-audits/temperature-logs", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLatest(data);
      toast.success("Temperature log saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Compliance Uploads</h1>
          <p className="text-sm text-muted-foreground">
            AI-assisted review creates potential issues for manager review.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:items-end">
          <Select
            id="compliance-location"
            label="Location"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            options={locations.map((location) => ({
              value: location.id,
              label: location.name,
            }))}
            placeholder={locations.length === 0 ? "No locations available" : "Select location"}
            disabled={locations.length === 0}
          />
          <Input
            id="compliance-audit-date"
            label="Audit date"
            type="date"
            value={auditDate}
            onChange={(event) => setAuditDate(event.target.value)}
          />
        </CardContent>
      </Card>

      {locations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No locations are assigned to your account. Ask an admin to grant location access.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <Camera className="text-muted-foreground" />
              <CardTitle className="text-base">Closing Pictures</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose a file for each area, then use Upload when ready.
            </p>
            {CLOSING_PHOTO_CATEGORIES.map((category) => (
              <FilePickField
                key={category}
                id={`closing-${category}`}
                label={CATEGORY_LABELS[category]}
                accept="image/jpeg,image/png,image/webp"
                chooseLabel="Choose photo"
                file={closingFiles[category] ?? null}
                disabled={submitting !== null}
                onFileChange={(file) => setClosingFiles((prev) => ({ ...prev, [category]: file }))}
              />
            ))}
            <Button onClick={submitClosing} disabled={submitting !== null}>
              {submitting === "closing" ? <Loader2 className="animate-spin" /> : <Upload />}
              Upload Closing Photos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground" />
              <CardTitle className="text-base">Temperature Log</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose your log file, then upload to run AI review.
            </p>
            <FilePickField
              id="temperature-log"
              label="Temperature log"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              chooseLabel="Choose file"
              file={tempFile}
              disabled={submitting !== null}
              onFileChange={setTempFile}
            />
            <Button onClick={submitTemperatureLog} disabled={submitting !== null}>
              {submitting === "temperature" ? <Loader2 className="animate-spin" /> : <Upload />}
              Upload Temperature Log
            </Button>
          </CardContent>
        </Card>
      </div>

      {latest && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Latest audit</CardTitle>
              <Badge variant="secondary">{latest.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {latest.summary ?? "Audit saved. AI summary was not generated."}
            </p>
            {latest.needsHumanReview && (
              <p className="text-sm font-medium">
                AI-assisted potential issues need manager review.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
