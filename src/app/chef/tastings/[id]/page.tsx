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
  submittedAt?: string;
  location: { name: string };
  tastingPeriod: { name: string };
  chef: { name: string } | null;
  menuSignagePacket?: { id: string; meal: string; status: string } | null;
  items: {
    id: string;
    dishName: string;
    temperatureCompliance: string;
    adjustmentsNeeded?: string;
    serviceGapMins?: number;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{tasting.location.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tasting.tastingPeriod.name} &middot; {new Date(tasting.date).toLocaleDateString()}
          </p>
        </div>
        <Badge className={statusColor(tasting.status)}>{tasting.status.replace("_", " ")}</Badge>
      </div>

      <Card>
        <CardTitle>Session Info</CardTitle>
        <dl className="mt-3 space-y-2 text-sm">
          {tasting.menuSignagePacket && (
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Linked Packet</dt>
              <dd className="font-medium">
                <Link
                  href={`/menu-signage/${tasting.menuSignagePacket.id}`}
                  className="text-primary hover:underline"
                >
                  {tasting.menuSignagePacket.meal} ({tasting.menuSignagePacket.status})
                </Link>
              </dd>
            </div>
          )}
          {tasting.chef && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Filled by</dt>
              <dd className="font-medium">{tasting.chef.name}</dd>
            </div>
          )}
          {tasting.submittedAt && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="font-medium">{formatDateTime(tasting.submittedAt)}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Dishes ({tasting.items.length})</h2>
        {tasting.items.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-foreground">{item.dishName}</h3>
              <Badge className={statusColor(item.temperatureCompliance)}>
                {item.temperatureCompliance.replace("_", " ")}
              </Badge>
            </div>

            {item.ratings.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{r.question.label}</span>
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

            {item.serviceGapMins != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Service gap: {item.serviceGapMins} min
              </p>
            )}
          </Card>
        ))}
      </div>

      {tasting.reviewActions.length > 0 && (
        <Card>
          <CardTitle>Review History</CardTitle>
          <div className="mt-3 space-y-2">
            {tasting.reviewActions.map((ra, i) => (
              <div key={i} className="text-sm border-l-2 border-border pl-3">
                <p className="font-medium">
                  {ra.reviewer.name}: {ra.fromStatus} &rarr; {ra.toStatus}
                </p>
                {ra.notes && <p className="text-muted-foreground">{ra.notes}</p>}
                <p className="text-xs text-muted-foreground">{formatDateTime(ra.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tasting.status === "draft" && (
        <div className="flex flex-col gap-3 pb-6">
          <Link href={`/chef/tastings/${tasting.id}/capture`}>
            <Button className="w-full">Start Tasting Review</Button>
          </Link>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.back()}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
