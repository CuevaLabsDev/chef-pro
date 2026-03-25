"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Question {
  id?: string;
  label: string;
  type: "star" | "select" | "text";
  scaleMin?: number;
  scaleMax?: number;
  isRequired: boolean;
  sortOrder: number;
}

interface Schema {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  questions: Question[];
}

export default function SchemaConfigPage() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { label: "Flavor / Aroma", type: "star", scaleMax: 5, isRequired: true, sortOrder: 0 },
    { label: "Texture", type: "star", scaleMax: 5, isRequired: true, sortOrder: 1 },
    { label: "Presentation", type: "star", scaleMax: 5, isRequired: true, sortOrder: 2 },
  ]);
  const [saving, setSaving] = useState(false);

  function loadSchemas() {
    fetch("/api/config/schema?all=1")
      .then((r) => r.json())
      .then(setSchemas)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSchemas();
  }, []);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { label: "", type: "star", scaleMax: 5, isRequired: true, sortOrder: prev.length },
    ]);
  }

  function updateQuestion(index: number, partial: Partial<Question>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...partial } : q)));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || questions.length === 0) return;
    setSaving(true);
    await fetch("/api/config/schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        questions: questions.map((q, i) => ({ ...q, sortOrder: i })),
      }),
    });
    setName("");
    setSaving(false);
    loadSchemas();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Rating Schema</h1>

      <Card>
        <CardTitle>Create New Schema Version</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Creating a new schema deactivates the previous one. Existing ratings are preserved.
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <Input
            id="schema-name"
            label="Schema Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Tasting v2"
          />

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  id={`q-label-${i}`}
                  label="Question"
                  value={q.label}
                  onChange={(e) => updateQuestion(i, { label: e.target.value })}
                  placeholder="e.g. Flavor"
                  className="flex-1"
                />
                <Select
                  id={`q-type-${i}`}
                  label="Type"
                  value={q.type}
                  onChange={(e) => updateQuestion(i, { type: e.target.value as Question["type"] })}
                  options={[
                    { value: "star", label: "Star" },
                    { value: "text", label: "Text" },
                    { value: "select", label: "Select" },
                  ]}
                />
                {q.type === "star" && (
                  <Input
                    id={`q-max-${i}`}
                    label="Max"
                    type="number"
                    value={q.scaleMax ?? 5}
                    onChange={(e) => updateQuestion(i, { scaleMax: parseInt(e.target.value) })}
                    className="w-20"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="text-red-400 hover:text-red-600 pb-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            <Button type="button" variant="ghost" size="sm" onClick={addQuestion}>
              + Add Question
            </Button>
          </div>

          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Create Schema"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Schema History ({schemas.length})</CardTitle>
        {loading ? (
          <p className="text-sm text-muted-foreground mt-3">Loading...</p>
        ) : schemas.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No schemas created yet</p>
        ) : (
          <div className="mt-4 divide-y">
            {schemas.map((s) => (
              <div key={s.id} className="py-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <span className="text-xs text-muted-foreground">v{s.version}</span>
                  {s.isActive && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {s.questions.length} question{s.questions.length !== 1 ? "s" : ""}:{" "}
                  {s.questions.map((q) => q.label).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
