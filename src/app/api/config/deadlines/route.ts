import { NextRequest, NextResponse } from "next/server";
import { createDeadlineRuleSchema } from "@/lib/validations";
import { getDeadlineRules, createDeadlineRule } from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";
import { handleServiceError } from "@/lib/api-errors";
import { createAuditEvent } from "@/modules/audit/service";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const rules = await getDeadlineRules();
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createDeadlineRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const rule = await createDeadlineRule(parsed.data);
    createAuditEvent({
      entityType: "DeadlineRule",
      entityId: rule.id,
      action: "created",
      actorId: user.id,
      actorName: user.name,
    }).catch(() => {});
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
