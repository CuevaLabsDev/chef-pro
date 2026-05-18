import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/identity-access/middleware";
import { createTemperatureLogAudit } from "@/modules/operational-compliance/service";

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
  const file = formData.get("file");

  if (typeof locationId !== "string" || typeof auditDate !== "string") {
    return NextResponse.json({ error: "locationId and auditDate are required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    const audit = await createTemperatureLogAudit(
      { locationId, auditDate, submittedById: user.id, file },
      user
    );
    return NextResponse.json(audit, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
