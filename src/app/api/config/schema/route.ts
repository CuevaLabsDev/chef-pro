import { NextRequest, NextResponse } from "next/server";
import { createRatingSchemaInput } from "@/lib/validations";
import {
  getActiveRatingSchema,
  getRatingSchemas,
  createRatingSchema,
} from "@/modules/configuration/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const all = req.nextUrl.searchParams.get("all");
  if (all) {
    const schemas = await getRatingSchemas();
    return NextResponse.json(schemas);
  }

  const schema = await getActiveRatingSchema();
  return NextResponse.json(schema);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "config.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createRatingSchemaInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schema = await createRatingSchema(parsed.data);
  return NextResponse.json(schema, { status: 201 });
}
