import { NextRequest, NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-errors";
import { requirePermission } from "@/modules/identity-access/middleware";
import { getPacketItemsForTasting } from "@/modules/menu-signage/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("packets.read");
  if (error) return error;

  const { id } = await params;

  try {
    const items = await getPacketItemsForTasting(id);
    return NextResponse.json(items);
  } catch (err) {
    return handleServiceError(err);
  }
}
