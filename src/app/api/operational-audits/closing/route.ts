import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  CLOSING_PHOTO_CATEGORIES,
  type ClosingPhotoCategory,
} from "@/modules/operational-compliance/types";
import { createClosingAudit } from "@/modules/operational-compliance/service";

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const formData = await req.formData();
  const locationId = formData.get("locationId");
  const auditDate = formData.get("auditDate") ?? new Date().toISOString().split("T")[0];

  if (typeof locationId !== "string" || typeof auditDate !== "string") {
    return NextResponse.json({ error: "locationId and auditDate are required" }, { status: 400 });
  }

  const photos = CLOSING_PHOTO_CATEGORIES.flatMap((category) => {
    const file = formData.get(category);
    if (!(file instanceof File)) return [];
    return [{ category: category as ClosingPhotoCategory, file }];
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "At least one closing photo is required" }, { status: 400 });
  }

  try {
    const audit = await createClosingAudit(
      { locationId, auditDate, submittedById: user.id, photos },
      user
    );
    return NextResponse.json(audit, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
