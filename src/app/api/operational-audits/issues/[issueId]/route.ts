import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/modules/identity-access/middleware";
import { updateIssueStatus } from "@/modules/operational-compliance/service";

const updateIssueSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "dismissed"]),
});

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  const body = await req.json();
  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { issueId } = await params;
    const issue = await updateIssueStatus(issueId, parsed.data.status, user);
    return NextResponse.json(issue);
  } catch (err) {
    return toErrorResponse(err);
  }
}
