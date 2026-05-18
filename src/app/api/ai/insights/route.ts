import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { runOrchestrator, saveInsightReport, listInsightReports } from "@/modules/ai-agents";
import type { AgentName, InsightType } from "@/modules/ai-agents";
import { createAuditEvent } from "@/modules/audit/service";
import { inspectPrompt } from "@/lib/lobstertrap";
import { z } from "zod";

const insightRequestSchema = z.object({
  type: z.enum(["tasting_analysis", "menu_review", "compliance_summary"]),
  entityId: z.string().optional(),
});

const INSIGHT_PROMPTS: Record<InsightType, (entityId?: string) => string> = {
  tasting_analysis: () =>
    "Generate a comprehensive tasting analysis report. Include: overall rating averages by location, top-performing and underperforming dishes, temperature compliance rates, checklist completion rates, and 3 specific actionable recommendations for improvement. Use data from the last 30 days.",
  menu_review: (entityId) =>
    entityId
      ? `Review menu packet ${entityId} thoroughly. Check all categories for completeness, identify missing information, flag pending amendments, and provide a readiness assessment.`
      : "Review all recent menu signage packets. Identify any that have issues, missing items, or pending amendments requiring attention.",
  compliance_summary: () =>
    "Generate a compliance summary report covering: session submission rates by location, temperature compliance trends, checklist completion rates, any locations consistently missing deadlines, and recommendations to improve compliance. Focus on the last 14 days.",
};

const INSIGHT_AGENTS: Record<InsightType, AgentName> = {
  tasting_analysis: "tasting-intelligence",
  menu_review: "menu-review",
  compliance_summary: "ops-assistant",
};

function parseRetryAfterSeconds(message: string) {
  const retryMatch = message.match(/retryDelay"?\s*:?\s*"?(\d+(?:\.\d+)?)s/i);
  if (retryMatch?.[1]) return Math.ceil(Number(retryMatch[1]));

  const textMatch = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (textMatch?.[1]) return Math.ceil(Number(textMatch[1]));

  return undefined;
}

function getAiErrorResponse(err: unknown) {
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500;
  const rawMessage = err instanceof Error ? err.message : "AI service error";
  const isQuotaError =
    status === 429 ||
    rawMessage.includes("RESOURCE_EXHAUSTED") ||
    rawMessage.toLowerCase().includes("quota exceeded");

  if (!isQuotaError) {
    return NextResponse.json({ error: rawMessage }, { status: 500 });
  }

  const retryAfterSeconds = parseRetryAfterSeconds(rawMessage);
  const headers = retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined;
  return NextResponse.json(
    {
      error: retryAfterSeconds
        ? `Gemini quota exceeded. Retry in ${retryAfterSeconds} seconds.`
        : "Gemini quota exceeded. Please retry shortly.",
      retryAfterSeconds,
    },
    { status: 429, headers }
  );
}

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

  const inspection = await inspectPrompt(prompt);
  if (!inspection.allowed) {
    await createAuditEvent({
      actorId: user.id,
      actorName: user.name ?? user.email,
      entityId: entityId ?? "insights",
      entityType: "AiInsight",
      action: "AI_INSPECTION_BLOCKED",
      metadata: { denyMessage: inspection.denyMessage, insightType: type },
    });
    return NextResponse.json({ error: inspection.denyMessage }, { status: 403 });
  }

  try {
    const { response, agentUsed } = await runOrchestrator(
      prompt,
      [],
      { user },
      INSIGHT_AGENTS[type]
    );
    if (!response.trim()) {
      throw new Error("AI generated an empty insight report");
    }

    const report = await saveInsightReport({
      userId: user.id,
      type,
      entityId,
      entityType: type === "menu_review" ? "MenuSignagePacket" : undefined,
      content: response,
      metadata: { agentUsed, prompt },
    });

    await createAuditEvent({
      actorId: user.id,
      actorName: user.name ?? user.email,
      entityId: report.id,
      entityType: "AiInsight",
      action: "AI_INSPECTION_ALLOWED",
      metadata: { insightType: type, agentUsed },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return getAiErrorResponse(err);
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
