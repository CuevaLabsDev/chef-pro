import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!["fte", "ops"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [total, blocked] = await Promise.all([
    prisma.auditEvent.count({
      where: { action: { in: ["AI_INSPECTION_ALLOWED", "AI_INSPECTION_BLOCKED"] } },
    }),
    prisma.auditEvent.count({ where: { action: "AI_INSPECTION_BLOCKED" } }),
  ]);

  return NextResponse.json({ total, blocked });
}
