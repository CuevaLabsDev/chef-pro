import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function conflictResponse(error: string, code: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error,
      code,
      ...(details ? { details } : {}),
    },
    { status: 409 }
  );
}

export function handleServiceError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[])?.join(", ") ?? "field";
      return NextResponse.json(
        {
          error: `A record with this ${target} already exists`,
          code: "DUPLICATE_RECORD",
        },
        { status: 409 }
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Record not found", code: "NOT_FOUND" }, { status: 404 });
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "This item is still connected to saved records and cannot be deleted permanently. Keep it inactive to preserve records.",
          code: "DELETE_BLOCKED_BY_RELATION",
        },
        { status: 409 }
      );
    }
  }
  console.error("[API Error]", err);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
