"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";

interface RatingQuestion {
  id: string;
  label: string;
  type: string;
  scaleMin?: number;
  scaleMax?: number;
  isRequired: boolean;
}

interface ItemData {
  dishName: string;
  sortOrder: number;
  temperatureCompliance: "compliant" | "non_compliant" | "not_checked";
  adjustmentsNeeded: string;
  ranOutTime: string;
  serviceGapMins: number | undefined;
  backupNotes: string;
  fteNotes: string;
  ratings: { questionId: string; numericValue?: number; textValue?: string }[];
  photoUrl?: string;
}

interface Props {
  item: ItemData;
  index: number;
  questions: RatingQuestion[];
  onChange: (updated: ItemData) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function TastingItemForm({ item, index, questions, onChange, onRemove, canRemove }: Props) {
  const [uploading, setUploading] = useState(false);

  function updateField<K extends keyof ItemData>(key: K, value: ItemData[K]) {
    onChange({ ...item, [key]: value });
  }

  function updateRating(questionId: string, numericValue: number) {
    const newRatings = item.ratings.map((r) =>
      r.questionId === questionId ? { ...r, numericValue } : r
    );
    onChange({ ...item, ratings: newRatings });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        updateField("photoUrl", data.url);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="relative">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
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
      )}

      <p className="text-xs font-medium text-gray-400 mb-3">Dish #{index + 1}</p>

      <div className="space-y-3">
        <Input
          id={`dish-${index}`}
          label="Dish Name"
          value={item.dishName}
          onChange={(e) => updateField("dishName", e.target.value)}
          placeholder="e.g. Bacon, Eggs, Oatmeal..."
        />

        {questions.map((q) => {
          const rating = item.ratings.find((r) => r.questionId === q.id);
          return (
            <div key={q.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {q.label}
                {q.isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {q.type === "star" ? (
                <StarRating
                  value={rating?.numericValue ?? 0}
                  max={q.scaleMax ?? 5}
                  onChange={(val) => updateRating(q.id, val)}
                />
              ) : (
                <Input
                  value={rating?.textValue ?? ""}
                  onChange={(e) => {
                    const newRatings = item.ratings.map((r) =>
                      r.questionId === q.id ? { ...r, textValue: e.target.value } : r
                    );
                    onChange({ ...item, ratings: newRatings });
                  }}
                />
              )}
            </div>
          );
        })}

        <Select
          id={`temp-${index}`}
          label="Temperature Compliance"
          value={item.temperatureCompliance}
          onChange={(e) =>
            updateField(
              "temperatureCompliance",
              e.target.value as ItemData["temperatureCompliance"]
            )
          }
          options={[
            { value: "not_checked", label: "Not Checked" },
            { value: "compliant", label: "Compliant" },
            { value: "non_compliant", label: "Non-Compliant" },
          ]}
        />

        <Input
          id={`adj-${index}`}
          label="Adjustments Needed"
          value={item.adjustmentsNeeded}
          onChange={(e) => updateField("adjustmentsNeeded", e.target.value)}
          placeholder="Optional notes on adjustments..."
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id={`runout-${index}`}
            label="Ran Out Time"
            value={item.ranOutTime}
            onChange={(e) => updateField("ranOutTime", e.target.value)}
            placeholder="e.g. 12:30"
          />
          <Input
            id={`gap-${index}`}
            label="Service Gap (min)"
            type="number"
            value={item.serviceGapMins ?? ""}
            onChange={(e) =>
              updateField("serviceGapMins", e.target.value ? parseInt(e.target.value) : undefined)
            }
          />
        </div>

        <Input
          id={`backup-${index}`}
          label="Backup / Notes"
          value={item.backupNotes}
          onChange={(e) => updateField("backupNotes", e.target.value)}
          placeholder="Name of backup dish or notes..."
        />

        <Input
          id={`fte-${index}`}
          label="FTE Notes"
          value={item.fteNotes}
          onChange={(e) => updateField("fteNotes", e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          {item.photoUrl ? (
            <div className="relative">
              <img src={item.photoUrl} alt="Dish" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => updateField("photoUrl", undefined)}
                className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
                />
              </svg>
              <span className="mt-1 text-xs text-gray-500">
                {uploading ? "Uploading..." : "Tap to add photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>
    </Card>
  );
}
