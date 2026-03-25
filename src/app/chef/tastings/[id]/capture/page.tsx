"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import {
  ChevronLeft,
  ChevronRight,
  Thermometer,
  FileEdit,
  Mic,
  MicOff,
  Check,
  Loader2,
  WifiOff,
  Save,
} from "lucide-react";

interface RatingQuestion {
  id: string;
  label: string;
  type: string;
}

interface ItemState {
  dishName: string;
  sortOrder: number;
  temperatureCompliance: "compliant" | "non_compliant" | "not_checked";
  adjustmentsNeeded: string;
  ratings: { questionId: string; numericValue?: number; textValue?: string }[];
}

interface SessionData {
  id: string;
  status: string;
  location: { name: string };
  tastingPeriod: { name: string };
  menuSignagePacket?: { id: string } | null;
  items: {
    id: string;
    dishName: string;
    sortOrder: number;
    temperatureCompliance: string;
    adjustmentsNeeded?: string;
    ratings: {
      questionId: string;
      numericValue?: number;
      textValue?: string;
      question: RatingQuestion;
    }[];
  }[];
}

const TEMP_OPTIONS = [
  { value: "compliant" as const, label: "Temp Good", color: "bg-green-600 text-white" },
  { value: "non_compliant" as const, label: "Temp Off", color: "bg-red-600 text-white" },
  { value: "not_checked" as const, label: "Not Checked", color: "bg-muted text-muted-foreground" },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  idle: null,
  saving: <Loader2 className="size-4 animate-spin" />,
  saved: <Save className="size-4 text-green-600" />,
  offline: <WifiOff className="size-4 text-amber-600" />,
  error: <span className="text-xs text-red-500">Not saved</span>,
};

export default function TastingCapturePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [items, setItems] = useState<ItemState[]>([]);
  const [questions, setQuestions] = useState<RatingQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentDesc, setAmendmentDesc] = useState("");
  const [amendmentType, setAmendmentType] = useState<string>("item_change");

  const { save, status: saveStatus } = useAutoSave<{ items: ItemState[] }>({
    url: `/api/tastings/${sessionId}`,
    localStorageKey: `tasting-draft-${sessionId}`,
  });

  useEffect(() => {
    fetch(`/api/tastings/${sessionId}`)
      .then((r) => r.json())
      .then((data: SessionData) => {
        setSession(data);
        const qs = data.items[0]?.ratings.map((r) => r.question) ?? [];
        setQuestions(qs);
        setItems(
          data.items.map((it) => ({
            dishName: it.dishName,
            sortOrder: it.sortOrder,
            temperatureCompliance: it.temperatureCompliance as ItemState["temperatureCompliance"],
            adjustmentsNeeded: it.adjustmentsNeeded ?? "",
            ratings: qs.map((q) => {
              const existing = it.ratings.find((r) => r.questionId === q.id);
              return {
                questionId: q.id,
                numericValue: existing?.numericValue ?? undefined,
                textValue: existing?.textValue ?? undefined,
              };
            }),
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const autoSave = useCallback(
    (updated: ItemState[]) => {
      save({ items: updated });
    },
    [save]
  );

  function updateItem(idx: number, patch: Partial<ItemState>) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      autoSave(next);
      return next;
    });
  }

  function updateRating(itemIdx: number, questionId: string, value: number) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[itemIdx] };
      item.ratings = item.ratings.map((r) =>
        r.questionId === questionId ? { ...r, numericValue: value } : r
      );
      next[itemIdx] = item;
      autoSave(next);
      return next;
    });
  }

  function startVoiceNote() {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR() as any;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const transcript: string = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        updateItem(currentIdx, {
          adjustmentsNeeded: (items[currentIdx].adjustmentsNeeded + " " + transcript).trim(),
        });
      }
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  async function handleSubmit() {
    setSubmitting(true);
    await fetch(`/api/tastings/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    await fetch(`/api/tastings/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    router.push(`/chef/tastings/${sessionId}`);
  }

  async function submitAmendment() {
    if (!session?.menuSignagePacket || !amendmentDesc.trim()) return;
    await fetch(`/api/packets/${session.menuSignagePacket.id}/amendments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: amendmentType,
        reason: "tasting_feedback",
        description: amendmentDesc.trim(),
      }),
    });
    setAmendmentOpen(false);
    setAmendmentDesc("");
  }

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (session.status !== "draft") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">This tasting has already been sent in.</p>
        <Button variant="link" onClick={() => router.push(`/chef/tastings/${sessionId}`)}>
          View tasting
        </Button>
      </div>
    );
  }

  const item = items[currentIdx];
  const total = items.length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{session.location.name}</h1>
            <p className="text-xs text-muted-foreground">{session.tastingPeriod.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {STATUS_ICONS[saveStatus]}
            <span className="text-xs font-medium tabular-nums">
              {currentIdx + 1}/{total}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Dish content */}
      <div className="flex-1 p-4 space-y-5 pb-32">
        <h2 className="text-xl font-bold text-center">{item.dishName}</h2>

        {/* Star ratings -- large tap targets */}
        {questions
          .filter((q) => q.type === "star")
          .map((q) => {
            const rating = item.ratings.find((r) => r.questionId === q.id);
            return (
              <div key={q.id} className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">{q.label}</label>
                <StarRating
                  value={rating?.numericValue ?? 0}
                  onChange={(v) => updateRating(currentIdx, q.id, v)}
                  size="lg"
                />
              </div>
            );
          })}

        {/* Temperature compliance */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Thermometer className="size-4" /> Temp Check
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TEMP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateItem(currentIdx, { temperatureCompliance: opt.value })}
                className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                  item.temperatureCompliance === opt.value
                    ? opt.color + " ring-2 ring-offset-2 ring-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes with voice */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Chef Notes</label>
          <div className="relative">
            <textarea
              value={item.adjustmentsNeeded}
              onChange={(e) => updateItem(currentIdx, { adjustmentsNeeded: e.target.value })}
              placeholder="Any adjustments, seasoning, plating notes..."
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={startVoiceNote}
              className="absolute right-2 top-2 p-1 rounded-full hover:bg-muted"
            >
              {listening ? (
                <Mic className="size-5 text-red-500 animate-pulse" />
              ) : (
                <MicOff className="size-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Amend signage button */}
        {session.menuSignagePacket && !amendmentOpen && (
          <Button variant="outline" className="w-full" onClick={() => setAmendmentOpen(true)}>
            <FileEdit className="size-4 mr-2" /> Update Food Signs
          </Button>
        )}

        {/* Amendment form */}
        {amendmentOpen && (
          <Card className="p-4 space-y-3 border-amber-200">
            <h3 className="text-sm font-semibold">Request Sign Change</h3>
            <select
              value={amendmentType}
              onChange={(e) => setAmendmentType(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="item_change">Update a dish (ingredients, name, etc.)</option>
              <option value="backup_swap">Swap in a backup dish</option>
              <option value="item_removed">Remove a dish from the menu</option>
              <option value="item_added">Add a new dish to the menu</option>
            </select>
            <textarea
              value={amendmentDesc}
              onChange={(e) => setAmendmentDesc(e.target.value)}
              placeholder="What needs to change on the signs?"
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAmendmentOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submitAmendment}
                disabled={!amendmentDesc.trim()}
                className="flex-1"
              >
                Send to Admin
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3 flex items-center gap-3 safe-area-pb">
        <Button
          variant="outline"
          size="icon"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => i - 1)}
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="flex-1">
          {currentIdx < total - 1 ? (
            <Button className="w-full" onClick={() => setCurrentIdx((i) => i + 1)}>
              Next Dish <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Check className="size-4 mr-2" />
              )}
              Send In Tasting
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          disabled={currentIdx >= total - 1}
          onClick={() => setCurrentIdx((i) => i + 1)}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
