"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { FieldDefinition } from "@/modules/daily-counts/types";

interface Location {
  id: string;
  name: string;
}

interface Period {
  id: string;
  name: string;
  sortOrder: number;
}

interface Section {
  id: string;
  label: string;
  group: string | null;
  fields: FieldDefinition[];
  sortOrder: number;
}

interface Template {
  id: string;
  sections: Section[];
  location: { id: string; name: string };
  tastingPeriod: { id: string; name: string };
}

interface Sheet {
  id: string;
  templateId: string;
  date: string;
  status: "draft" | "submitted";
  notes: string | null;
  submittedBy: { id: string; name: string } | null;
  submittedAt: string | null;
  amendedBy: { id: string; name: string } | null;
  amendedAt: string | null;
  amendReason: string | null;
  entries: { sectionId: string; values: Record<string, string | number | null> }[];
  template: Template;
}

function computeSectionTotal(fields: FieldDefinition[], values: Record<string, unknown>) {
  let initial = 0;
  let addition = 0;
  let remainder = 0;
  for (const f of fields) {
    const v = typeof values[f.key] === "number" ? (values[f.key] as number) : 0;
    if (f.role === "initial") initial += v;
    else if (f.role === "addition") addition += v;
    else if (f.role === "remainder") remainder += v;
  }
  const total = initial + addition;
  return { total, totalUsed: total - remainder };
}

function SectionCard({
  section,
  values,
  onChange,
  disabled,
}: {
  section: Section;
  values: Record<string, string | number | null>;
  onChange: (sectionId: string, key: string, value: string | number | null) => void;
  disabled: boolean;
}) {
  const hasNumericRoles = section.fields.some(
    (f) => f.role === "initial" || f.role === "addition" || f.role === "remainder"
  );
  const { total, totalUsed } = computeSectionTotal(section.fields, values);

  return (
    <Card className="p-4 space-y-3">
      <CardTitle className="text-sm font-semibold">{section.label}</CardTitle>
      <div className="space-y-2">
        {section.fields.map((field) => {
          if (field.type === "number") {
            return (
              <Input
                key={field.key}
                id={`${section.id}-${field.key}`}
                label={field.label}
                type="number"
                value={values[field.key] ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  onChange(section.id, field.key, val);
                }}
                disabled={disabled}
              />
            );
          }
          if (field.type === "time") {
            return (
              <Input
                key={field.key}
                id={`${section.id}-${field.key}`}
                label={field.label}
                type="time"
                value={(values[field.key] as string) ?? ""}
                onChange={(e) => onChange(section.id, field.key, e.target.value || null)}
                disabled={disabled}
              />
            );
          }
          return (
            <Input
              key={field.key}
              id={`${section.id}-${field.key}`}
              label={field.label}
              type="text"
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => onChange(section.id, field.key, e.target.value || null)}
              disabled={disabled}
            />
          );
        })}
      </div>
      {hasNumericRoles && (
        <div className="border-t pt-2 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Total</span>
            <span className="font-medium text-foreground">{total}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Used</span>
            <span className="font-bold text-foreground">{totalUsed}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DailyCountsTodayPage() {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<Location[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [locationId, setLocationId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string | number | null>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amending, setAmending] = useState(false);
  const [amendReason, setAmendReason] = useState("");

  const permissionKeys =
    (session?.user as unknown as { permissionKeys?: string[] } | undefined)?.permissionKeys ?? [];
  const canRecord = permissionKeys.includes("counts.record");

  useEffect(() => {
    fetch("/api/config/locations")
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => setLocations([]));

    fetch("/api/config/periods")
      .then((r) => r.json())
      .then((data: Period[]) => setPeriods(data.filter((p) => p.sortOrder >= 0)))
      .catch(() => setPeriods([]));
  }, []);

  useEffect(() => {
    if (!locationId || !periodId) {
      setTemplate(null);
      setSheet(null);
      return;
    }

    setLoading(true);
    fetch(`/api/daily-counts/templates?locationId=${locationId}&periodId=${periodId}`)
      .then((r) => r.json())
      .then((data: Template | null) => {
        setTemplate(data);
        if (!data) {
          setSheet(null);
          setLoading(false);
          return;
        }
        const today = new Date().toISOString().split("T")[0];
        return fetch("/api/daily-counts/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: data.id, date: today }),
        });
      })
      .then((r) => r?.json())
      .then((data: Sheet | undefined) => {
        if (data) {
          setSheet(data);
          const initial: Record<string, Record<string, string | number | null>> = {};
          for (const entry of data.entries) {
            initial[entry.sectionId] = entry.values;
          }
          setValues(initial);
        }
        setLoading(false);
      })
      .catch(() => {
        setTemplate(null);
        setSheet(null);
        setLoading(false);
      });
  }, [locationId, periodId]);

  const handleFieldChange = useCallback(
    (sectionId: string, key: string, value: string | number | null) => {
      setValues((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], [key]: value },
      }));
    },
    []
  );

  async function handleSave() {
    if (!sheet) return;
    setSaving(true);
    try {
      const entries = Object.entries(values).map(([sectionId, vals]) => ({
        sectionId,
        values: vals,
      }));
      const res = await fetch(`/api/daily-counts/sheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSheet(data);
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!sheet) return;
    setSaving(true);
    try {
      const entries = Object.entries(values).map(([sectionId, vals]) => ({
        sectionId,
        values: vals,
      }));
      await fetch(`/api/daily-counts/sheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      const res = await fetch(`/api/daily-counts/sheets/${sheet.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setSheet(data);
      toast.success("Count sheet submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAmend() {
    if (!sheet || !amendReason.trim()) return;
    setSaving(true);
    try {
      const entries = Object.entries(values).map(([sectionId, vals]) => ({
        sectionId,
        values: vals,
      }));
      const res = await fetch(`/api/daily-counts/sheets/${sheet.id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: amendReason, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Amend failed");
      setSheet(data);
      setAmending(false);
      setAmendReason("");
      toast.success("Sheet amended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Amend failed");
    } finally {
      setSaving(false);
    }
  }

  const isSubmitted = sheet?.status === "submitted";
  const isEditable = canRecord && (!isSubmitted || amending);

  const grouped = useMemo(() => {
    if (!template) return { groups: new Map<string, Section[]>(), ungrouped: [] as Section[] };
    const groups = new Map<string, Section[]>();
    const ungrouped: Section[] = [];
    for (const section of template.sections) {
      if (section.group) {
        const list = groups.get(section.group) ?? [];
        list.push(section);
        groups.set(section.group, list);
      } else {
        ungrouped.push(section);
      }
    }
    return { groups, ungrouped };
  }, [template]);

  const grandTotal = useMemo(() => {
    if (!template) return 0;
    return template.sections.reduce((sum, section) => {
      const { totalUsed } = computeSectionTotal(section.fields, values[section.id] ?? {});
      return sum + totalUsed;
    }, 0);
  }, [template, values]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Counts</h1>
        <p className="text-sm text-muted-foreground">
          Record plate counts and service items for today.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="dc-location"
            label="Cafe / Concept"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Select location"
          />
          <Select
            id="dc-period"
            label="Period"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select period"
          />
        </div>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading count sheet...</p>}

      {!loading && locationId && periodId && !template && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            No template configured for this location and period.
          </p>
          {permissionKeys.includes("counts.configure") && (
            <p className="text-sm text-muted-foreground mt-2">
              Go to <strong>Setup</strong> to create a count sheet template.
            </p>
          )}
        </Card>
      )}

      {!loading && sheet && template && (
        <>
          <div className="flex items-center gap-3">
            <Badge
              className={
                isSubmitted
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }
            >
              {isSubmitted ? "Submitted" : "Draft"}
            </Badge>
            {sheet.submittedBy && (
              <span className="text-xs text-muted-foreground">
                by {sheet.submittedBy.name}
                {sheet.submittedAt && ` at ${new Date(sheet.submittedAt).toLocaleTimeString()}`}
              </span>
            )}
            {sheet.amendedBy && (
              <span className="text-xs text-muted-foreground">
                | Amended by {sheet.amendedBy.name}
                {sheet.amendReason && ` — "${sheet.amendReason}"`}
              </span>
            )}
          </div>

          {Array.from(grouped.groups.entries()).map(([groupName, sections]) => (
            <div key={groupName} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{groupName}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    values={values[section.id] ?? {}}
                    onChange={handleFieldChange}
                    disabled={!isEditable}
                  />
                ))}
              </div>
              <div className="text-right text-sm font-medium text-muted-foreground">
                {groupName} Total:{" "}
                <span className="text-foreground font-bold">
                  {sections.reduce((sum, s) => {
                    const { totalUsed } = computeSectionTotal(s.fields, values[s.id] ?? {});
                    return sum + totalUsed;
                  }, 0)}
                </span>
              </div>
            </div>
          ))}

          {grouped.ungrouped.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.ungrouped.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    values={values[section.id] ?? {}}
                    onChange={handleFieldChange}
                    disabled={!isEditable}
                  />
                ))}
              </div>
            </div>
          )}

          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
              <p className="text-3xl font-bold text-foreground">{grandTotal}</p>
            </div>
            <div className="flex items-center gap-3">
              {!isSubmitted && canRecord && (
                <>
                  <Button variant="outline" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Submitting..." : "Submit & Lock"}
                  </Button>
                </>
              )}
              {isSubmitted && canRecord && !amending && (
                <Button variant="outline" onClick={() => setAmending(true)}>
                  Amend
                </Button>
              )}
              {amending && (
                <div className="flex items-center gap-2">
                  <Textarea
                    placeholder="Reason for amendment..."
                    value={amendReason}
                    onChange={(e) => setAmendReason(e.target.value)}
                    className="min-w-[200px]"
                  />
                  <Button onClick={handleAmend} disabled={saving || !amendReason.trim()}>
                    {saving ? "Saving..." : "Save Amendment"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAmending(false);
                      setAmendReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
