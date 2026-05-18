import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { getAssetSignedUrl } from "@/modules/operational-compliance/service";

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  try {
    const { assetId } = await params;
    const signed = await getAssetSignedUrl(assetId, user);
    return NextResponse.json(signed);
  } catch (err) {
    return toErrorResponse(err);
  }
}
