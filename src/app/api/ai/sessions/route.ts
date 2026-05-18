import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { listChatSessions, createChatSession } from "@/modules/ai-agents";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!["fte", "ops"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await listChatSessions(user.id);
  return NextResponse.json(sessions);
}

export async function POST() {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!["fte", "ops"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await createChatSession(user.id);
  return NextResponse.json(session, { status: 201 });
}
