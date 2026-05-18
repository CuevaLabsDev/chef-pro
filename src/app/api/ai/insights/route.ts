import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import {
  runOrchestrator,
  saveInsightReport,
  listInsightReports,
} from "@/modules/ai-agents";
import type { InsightType } from "@/modules/ai-agents";
import { z } from "zod";

const insightRequestSchema = z.object({
  type: z.enum(["tasting_analysis", "menu_review", "compliance_summary"]),
  entityId: z.string().optional(),
});

const INSIGHT_PROMPTS: Record<InsightType, (entityId?: string) => string> = {
  tasting_analysis:
    (_entityId) =>
      "Generate a comprehensive tasting analysis report. Include: overall rating averages by location, top-performing and underperforming dishes, temperature compliance rates, checklist completion rates, and 3 specific actionable recommendations for improvement. Use data from the last 30 days.",
  menu_review: (entityId) =>
    entityId
      ? `Review menu packet ${entityId} thoroughly. Check all categories for completeness, identify missing information, flag pending amendments, and provide a readiness assessment.`
      : "Review all recent menu signage packets. Identify any that have issues, missing items, or pending amendments requiring attention.",
  compliance_summary:
    (_entityId) =>
      "Generate a compliance summary report covering: session submission rates by location, temperature compliance trends, checklist completion rates, any locations consistently missing deadlines, and recommendations to improve compliance. Focus on the last 14 days.",
};

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!["fte", "ops"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = insightRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, entityId } = parsed.data;
  const prompt = INSIGHT_PROMPTS[type](entityId);

  try {
    const { response, agentUsed } = await runOrchestrator(prompt, []);
    const report = await saveInsightReport({
      userId: user.id,
      type,
      entityId,
      entityType: type === "menu_review" ? "MenuSignagePacket" : undefined,
      content: response,
      metadata: { agentUsed, prompt },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  if (!["fte", "ops"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const type = params.get("type") as InsightType | null;

  const reports = await listInsightReports(user.id, type ?? undefined);
  return NextResponse.json(reports);
}
