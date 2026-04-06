"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import type { FieldDefinition } from "@/modules/daily-counts/types";

interface Location {
  id: string;
  name: string;
}

interface Period {
  id: string;
  name: string;
}

interface SectionDraft {
  tempId: string;
  label: string;
  group: string;
  fields: FieldDefinition[];
}

interface Template {
  id: string;
  sections: {
    id: string;
    label: string;
    group: string | null;
    fields: FieldDefinition[];
    sortOrder: number;
  }[];
}

const STARTER_TEMPLATES = {
  standard_cafe: {
    label: "Standard Cafe (3 Lines + Deli + Pastry/Dessert)",
    sections: [
      {
        label: "Line 1",
        group: "Hotline",
        fields: [
          { key: "plates", label: "Plates", type: "number" as const, role: "initial" as const },
          { key: "add", label: "Add", type: "number" as const, role: "addition" as const },
          {
            key: "leftover",
            label: "Left Over",
            type: "number" as const,
            role: "remainder" as const,
          },
        ],
      },
      {
        label: "Line 2",
        group: "Hotline",
        fields: [
          { key: "plates", label: "Plates", type: "number" as const, role: "initial" as const },
          { key: "add", label: "Add", type: "number" as const, role: "addition" as const },
          {
            key: "leftover",
            label: "Left Over",
            type: "number" as const,
            role: "remainder" as const,
          },
        ],
      },
      {
        label: "Line 3",
        group: "Hotline",
        fields: [
          { key: "plates", label: "Plates", type: "number" as const, role: "initial" as const },
          { key: "add", label: "Add", type: "number" as const, role: "addition" as const },
          {
            key: "leftover",
            label: "Left Over",
            type: "number" as const,
            role: "remainder" as const,
          },
        ],
      },
      {
        label: "Deli",
        group: "Other",
        fields: [
          { key: "plates", label: "Plates", type: "number" as const, role: "initial" as const },
          { key: "add", label: "Add", type: "number" as const, role: "addition" as const },
          {
            key: "leftover",
            label: "Left Over",
            type: "number" as const,
            role: "remainder" as const,
          },
        ],
      },
      {
        label: "Pastry 1",
        group: "",
        fields: [
          { key: "name", label: "Item Name", type: "text" as const, role: "label" as const },
          {
            key: "leftover",
            label: "Left Over",
            type: "number" as const,
            role: "remainder" as const,
          },
          { key: "time_ran_out", label: "Time Ran Out", type: "time" as const },
        ],
      },
      {
        label: "Pastry 2",
        group: "",
        fields: [
          { key: "name", label: "Item Name", type: "text" as const, role: "label" as const },
          {
            key: "leftover",
            label: "Left Over",
            type: "number" as const,
            role: "remainder" as const,
          },
          { key: "time_ran_out", label: "Time Ran Out", type: "time" as const },
        ],
      },
    ],
  },
};

let idCounter = 0;
function tempId() {
  return `tmp_${++idCounter}`;
}

function toKey(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "field"
  );
}

function FieldRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: FieldDefinition;
  onUpdate: (updated: FieldDefinition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px_120px_28px] gap-2 items-end">
      <Input
        label="Label"
        value={field.label}
        onChange={(e) => {
          const label = e.target.value;
          onUpdate({ ...field, label, key: toKey(label) });
        }}
      />
      <Select
        label="Type"
        value={field.type}
        onChange={(e) => onUpdate({ ...field, type: e.target.value as FieldDefinition["type"] })}
        options={[
          { value: "number", label: "Number" },
          { value: "text", label: "Text" },
          { value: "time", label: "Time" },
        ]}
      />
      <Select
        label="Role"
        value={field.role ?? ""}
        onChange={(e) =>
          onUpdate({
            ...field,
            role: (e.target.value || undefined) as FieldDefinition["role"],
          })
        }
        options={[
          { value: "initial", label: "Initial" },
          { value: "addition", label: "Addition" },
          { value: "remainder", label: "Remainder" },
          { value: "label", label: "Label" },
        ]}
        placeholder="None"
      />
      <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-9 w-9">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  section: SectionDraft;
  index: number;
  total: number;
  onUpdate: (updated: SectionDraft) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  function addField() {
    onUpdate({
      ...section,
      fields: [
        ...section.fields,
        { key: `field_${section.fields.length}`, label: "", type: "number" },
      ],
    });
  }

  function updateField(fieldIndex: number, updated: FieldDefinition) {
    const fields = [...section.fields];
    fields[fieldIndex] = updated;
    onUpdate({ ...section, fields });
  }

  function removeField(fieldIndex: number) {
    onUpdate({ ...section, fields: section.fields.filter((_, i) => i !== fieldIndex) });
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            <ArrowUp className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
          >
            <ArrowDown className="size-3" />
          </Button>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Section Name"
            value={section.label}
            onChange={(e) => onUpdate({ ...section, label: e.target.value })}
          />
          <Input
            label="Group (optional)"
            value={section.group}
            onChange={(e) => onUpdate({ ...section, group: e.target.value })}
            placeholder="e.g. Hotline, Desserts"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="space-y-2 pl-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fields</p>
        {section.fields.map((field, fi) => (
          <FieldRow
            key={fi}
            field={field}
            onUpdate={(updated) => updateField(fi, updated)}
            onRemove={() => removeField(fi)}
          />
        ))}
        <Button variant="outline" size="sm" onClick={addField} className="gap-1">
          <Plus className="size-3" /> Add Field
        </Button>
      </div>
    </Card>
  );
}

export default function DailyCountsConfigurePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [locationId, setLocationId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/config/locations")
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => setLocations([]));

    fetch("/api/config/periods")
      .then((r) => r.json())
      .then(setPeriods)
      .catch(() => setPeriods([]));
  }, []);

  useEffect(() => {
    if (!locationId || !periodId) {
      setSections([]);
      setExistingTemplateId(null);
      return;
    }
    setLoading(true);
    fetch(`/api/daily-counts/templates?locationId=${locationId}&periodId=${periodId}`)
      .then((r) => r.json())
      .then((data: Template | null) => {
        if (data) {
          setExistingTemplateId(data.id);
          setSections(
            data.sections.map((s) => ({
              tempId: tempId(),
              label: s.label,
              group: s.group ?? "",
              fields: s.fields,
            }))
          );
        } else {
          setExistingTemplateId(null);
          setSections([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setSections([]);
        setLoading(false);
      });
  }, [locationId, periodId]);

  const addSection = useCallback(() => {
    setSections((prev) => [
      ...prev,
      {
        tempId: tempId(),
        label: "",
        group: "",
        fields: [
          { key: "plates", label: "Plates", type: "number", role: "initial" },
          { key: "leftover", label: "Left Over", type: "number", role: "remainder" },
        ],
      },
    ]);
  }, []);

  function applyStarter(key: keyof typeof STARTER_TEMPLATES) {
    const starter = STARTER_TEMPLATES[key];
    setSections(
      starter.sections.map((s) => ({
        tempId: tempId(),
        label: s.label,
        group: s.group,
        fields: s.fields,
      }))
    );
  }

  function updateSection(index: number, updated: SectionDraft) {
    setSections((prev) => prev.map((s, i) => (i === index ? updated : s)));
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: "up" | "down") {
    setSections((prev) => {
      const arr = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function handleSave() {
    if (!locationId || !periodId || sections.length === 0) return;
    setSaving(true);
    try {
      const body = {
        locationId,
        tastingPeriodId: periodId,
        sections: sections.map((s, i) => ({
          label: s.label,
          group: s.group || null,
          fields: s.fields.map((f) => ({
            key: f.key || toKey(f.label),
            label: f.label,
            type: f.type,
            ...(f.role ? { role: f.role } : {}),
          })),
          sortOrder: i,
        })),
      };

      const res = await fetch("/api/daily-counts/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setExistingTemplateId(data.id);
      toast.success("Template saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Count Sheet Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure the count sheet template for each location and period.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="cfg-location"
            label="Cafe / Concept"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Select location"
          />
          <Select
            id="cfg-period"
            label="Period"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select period"
          />
        </div>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading template...</p>}

      {!loading && locationId && periodId && (
        <>
          {existingTemplateId && (
            <p className="text-sm text-muted-foreground">
              Editing existing template. Changes will apply to future count sheets.
            </p>
          )}

          {sections.length === 0 && (
            <Card className="p-6 text-center space-y-4">
              <p className="text-muted-foreground">
                No template yet. Start from a common layout or build from scratch.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={() => applyStarter("standard_cafe")}>
                  Start from Standard Cafe
                </Button>
                <Button variant="outline" onClick={addSection}>
                  Start from Scratch
                </Button>
              </div>
            </Card>
          )}

          {sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((section, i) => (
                <SectionEditor
                  key={section.tempId}
                  section={section}
                  index={i}
                  total={sections.length}
                  onUpdate={(updated) => updateSection(i, updated)}
                  onRemove={() => removeSection(i)}
                  onMove={(direction) => moveSection(i, direction)}
                />
              ))}

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={addSection} className="gap-1">
                  <Plus className="size-4" /> Add Section
                </Button>
                <div className="flex-1" />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
