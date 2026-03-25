import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleServiceError } from "@/lib/api-errors";
import { requireAuth } from "@/modules/identity-access/middleware";
import { subscribeToPush, unsubscribeFromPush } from "@/modules/notifications/push-service";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
  }

  try {
    await subscribeToPush(user!.id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const endpoint = body?.endpoint;
  if (!endpoint || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
  }

  try {
    await unsubscribeFromPush(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
