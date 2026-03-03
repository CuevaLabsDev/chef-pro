import { describe, expect, it } from "vitest";
import { formatDate, statusColor } from "@/lib/utils";

describe("utils", () => {
  it("formats a date in US short format", () => {
    expect(formatDate(new Date(2026, 2, 2))).toBe("Mar 2, 2026");
  });

  it("returns known color classes for known statuses", () => {
    expect(statusColor("submitted")).toContain("bg-blue-100");
  });

  it("falls back to default classes for unknown statuses", () => {
    expect(statusColor("unknown")).toBe("bg-gray-100 text-gray-700");
  });
});
