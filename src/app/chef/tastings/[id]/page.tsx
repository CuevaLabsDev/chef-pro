"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { statusColor, formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface TastingDetail {
  id: string;
  date: string;
  status: string;
  managerName?: string;
  menuName?: string;
  checklistMenuPackage: boolean;
  checklistDigitalSignage: boolean;
  checklistFoodCards: boolean;
  submittedAt?: string;
  location: { name: string };
  tastingPeriod: { name: string };
  chef: { name: string };
  menuSignagePacket?: { id: string; meal: string; status: string } | null;
  items: {
    id: string;
    dishName: string;
    temperatureCompliance: string;
    adjustmentsNeeded?: string;
    ranOutTime?: string;
    serviceGapMins?: number;
    backupNotes?: string;
    fteNotes?: string;
    photoUrl?: string;
    ratings: {
      numericValue?: number;
      textValue?: string;
      question: { label: string; type: string };
    }[];
  }[];
  reviewActions: {
    fromStatus: string;
    toStatus: string;
    notes?: string;
    createdAt: string;
    reviewer: { name: string };
  }[];
}

export default function TastingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tasting, setTasting] = useState<TastingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tastings/${params.id}`)
      .then((r) => r.json())
      .then(setTasting)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit() {
    await fetch(`/api/tastings/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    router.refresh();
    window.location.reload();
  }

  if (loading || !tasting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tasting.location.name}</h1>
          <p className="text-sm text-gray-500">
            {tasting.tastingPeriod.name} &middot; {new Date(tasting.date).toLocaleDateString()}
          </p>
        </div>
        <Badge className={statusColor(tasting.status)}>{tasting.status.replace("_", " ")}</Badge>
      </div>

      <Card>
        <CardTitle>Session Info</CardTitle>
        <dl className="mt-3 space-y-2 text-sm">
          {tasting.managerName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Manager</dt>
              <dd className="font-medium">{tasting.managerName}</dd>
            </div>
          )}
          {tasting.menuName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Menu</dt>
              <dd className="font-medium">{tasting.menuName}</dd>
            </div>
          )}
          {tasting.menuSignagePacket && (
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Linked Packet</dt>
              <dd className="font-medium">
                <Link
                  href={`/packets/${tasting.menuSignagePacket.id}`}
                  className="text-indigo-600 hover:underline"
                >
                  {tasting.menuSignagePacket.meal} ({tasting.menuSignagePacket.status})
                </Link>
              </dd>
            </div>
          )}
          {tasting.submittedAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Submitted</dt>
              <dd className="font-medium">{formatDateTime(tasting.submittedAt)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex gap-4 text-sm">
          <span className={tasting.checklistMenuPackage ? "text-green-600" : "text-red-500"}>
            {tasting.checklistMenuPackage ? "Menu pkg" : "Menu pkg missing"}
          </span>
          <span className={tasting.checklistDigitalSignage ? "text-green-600" : "text-red-500"}>
            {tasting.checklistDigitalSignage ? "Signage" : "Signage missing"}
          </span>
          <span className={tasting.checklistFoodCards ? "text-green-600" : "text-red-500"}>
            {tasting.checklistFoodCards ? "Food cards" : "Cards missing"}
          </span>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Dishes ({tasting.items.length})</h2>
        {tasting.items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900">{item.dishName}</h3>
              <Badge className={statusColor(item.temperatureCompliance)}>
                {item.temperatureCompliance.replace("_", " ")}
              </Badge>
            </div>

            {item.ratings.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">{r.question.label}</span>
                {r.question.type === "star" ? (
                  <StarRating value={r.numericValue ?? 0} readonly size="sm" />
                ) : (
                  <span className="text-sm font-medium">{r.textValue}</span>
                )}
              </div>
            ))}

            {item.adjustmentsNeeded && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 mt-2">
                {item.adjustmentsNeeded}
              </p>
            )}

            {item.photoUrl && (
              <img
                src={item.photoUrl}
                alt={item.dishName}
                className="w-full h-40 object-cover rounded-lg mt-2"
              />
            )}

            {(item.ranOutTime || item.serviceGapMins || item.backupNotes || item.fteNotes) && (
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                {item.ranOutTime && <p>Ran out: {item.ranOutTime}</p>}
                {item.serviceGapMins != null && <p>Service gap: {item.serviceGapMins} min</p>}
                {item.backupNotes && <p>Backup: {item.backupNotes}</p>}
                {item.fteNotes && <p>FTE: {item.fteNotes}</p>}
              </div>
            )}
          </Card>
        ))}
      </div>

      {tasting.reviewActions.length > 0 && (
        <Card>
          <CardTitle>Review History</CardTitle>
          <div className="mt-3 space-y-2">
            {tasting.reviewActions.map((ra, i) => (
              <div key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                <p className="font-medium">
                  {ra.reviewer.name}: {ra.fromStatus} &rarr; {ra.toStatus}
                </p>
                {ra.notes && <p className="text-gray-500">{ra.notes}</p>}
                <p className="text-xs text-gray-400">{formatDateTime(ra.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tasting.status === "draft" && (
        <div className="flex gap-3 pb-6">
          <Button variant="secondary" className="flex-1" onClick={() => router.back()}>
            Back
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
