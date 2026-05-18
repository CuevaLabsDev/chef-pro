import { describe, expect, it } from "vitest";
import { evaluateTemperatureEntry } from "./rules";

describe("evaluateTemperatureEntry", () => {
  it("marks cold entries above 41F as AI-assisted potential issues", () => {
    const result = evaluateTemperatureEntry({
      entryTime: "09:00",
      stationName: "Walk-in",
      itemName: "Milk",
      holdingType: "cold",
      temperatureRaw: "45F",
      temperatureF: 45,
      unit: "F",
      initials: "AB",
      confidence: 0.93,
    });

    expect(result.status).toBe("potential_issue");
    expect(result.issues.some((issue) => issue.ruleCode === "TEMP_COLD_THRESHOLD")).toBe(true);
  });

  it("marks hot entries at or above 135F compliant when complete", () => {
    const result = evaluateTemperatureEntry({
      entryTime: "12:00",
      stationName: "Line",
      itemName: "Soup",
      holdingType: "hot",
      temperatureRaw: "142F",
      temperatureF: 142,
      unit: "F",
      initials: "CD",
      confidence: 0.9,
    });

    expect(result.status).toBe("compliant");
    expect(result.issues).toHaveLength(0);
  });

  it("requires manager review when holding type is ambiguous", () => {
    const result = evaluateTemperatureEntry({
      entryTime: "10:30",
      stationName: "Prep",
      itemName: "Sauce",
      holdingType: "unknown",
      temperatureRaw: "50",
      temperatureF: 50,
      unit: "F",
      initials: "EF",
      confidence: 0.88,
    });

    expect(result.status).toBe("needs_review");
    expect(result.issues.some((issue) => issue.ruleCode === "TEMP_UNKNOWN_HOLDING_TYPE")).toBe(
      true
    );
  });

  it("requires manager review for low-confidence OCR even when values look complete", () => {
    const result = evaluateTemperatureEntry({
      entryTime: "08:15",
      stationName: "Walk-in",
      itemName: "Yogurt",
      holdingType: "cold",
      temperatureRaw: "39F",
      temperatureF: 39,
      unit: "F",
      initials: "GH",
      confidence: 0.42,
    });

    expect(result.status).toBe("needs_review");
    expect(result.issues.some((issue) => issue.ruleCode === "TEMP_LOW_CONFIDENCE")).toBe(true);
  });
});
