import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { handleServiceError } from "./api-errors";

describe("handleServiceError", () => {
  it("returns 409 for unique constraint violations (P2002)", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "7.0.0",
      meta: { target: ["name"] },
    });

    const res = handleServiceError(err);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toContain("name");
    expect(body.error).toContain("already exists");
  });

  it("returns 404 for record not found (P2025)", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "7.0.0",
    });

    const res = handleServiceError(err);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("Record not found");
  });

  it("returns 409 for relation conflicts on delete (P2003)", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
      code: "P2003",
      clientVersion: "7.0.0",
    });

    const res = handleServiceError(err);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.code).toBe("DELETE_BLOCKED_BY_RELATION");
  });

  it("returns 500 for unknown errors", async () => {
    const res = handleServiceError(new Error("something broke"));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("returns 409 with fallback field name when meta.target is missing", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "7.0.0",
    });

    const res = handleServiceError(err);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toContain("field");
  });
});
