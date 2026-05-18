import type {
  ComplianceRuleSet,
  ComplianceStatus,
  IssueInput,
  TemperatureEntryInput,
} from "./types";

export const DEFAULT_COMPLIANCE_RULE_SET: ComplianceRuleSet = {
  version: "fda-food-code-2022-defaults-v1",
  source: "FDA Food Code model-code defaults; local rules may vary",
  coldMaxF: 41,
  hotMinF: 135,
  minConfidence: 0.7,
};

function missing(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function evaluateTemperatureEntry(
  entry: TemperatureEntryInput,
  rules: ComplianceRuleSet = DEFAULT_COMPLIANCE_RULE_SET
): { status: ComplianceStatus; issues: IssueInput[] } {
  const issues: IssueInput[] = [];

  if (missing(entry.entryTime)) {
    issues.push({
      severity: "medium",
      type: "missing_temperature_field",
      title: "Temperature check time needs manager review",
      description: "AI could not identify a timestamp for this temperature log entry.",
      recommendation: "Verify the original log and add the check time if available.",
      confidence: entry.confidence,
      ruleCode: "TEMP_MISSING_TIME",
    });
  }

  if (missing(entry.stationName) && missing(entry.itemName)) {
    issues.push({
      severity: "medium",
      type: "missing_temperature_field",
      title: "Station or item needs manager review",
      description: "AI could not identify a station or item for this temperature log entry.",
      recommendation: "Verify the source log and identify the checked station or food item.",
      confidence: entry.confidence,
      ruleCode: "TEMP_MISSING_STATION_ITEM",
    });
  }

  if (missing(entry.temperatureRaw) && entry.temperatureF === null) {
    issues.push({
      severity: "high",
      type: "missing_temperature_field",
      title: "Temperature value needs manager review",
      description: "AI could not identify a temperature value for this log entry.",
      recommendation: "Verify the original log before treating this entry as complete.",
      confidence: entry.confidence,
      ruleCode: "TEMP_MISSING_VALUE",
    });
  }

  if (missing(entry.initials)) {
    issues.push({
      severity: "medium",
      type: "missing_temperature_field",
      title: "Initials need manager review",
      description: "AI could not identify staff initials for this temperature log entry.",
      recommendation: "Confirm who completed the check and update the audit trail if needed.",
      confidence: entry.confidence,
      ruleCode: "TEMP_MISSING_INITIALS",
    });
  }

  if (entry.confidence < rules.minConfidence) {
    issues.push({
      severity: "medium",
      type: "low_confidence_extraction",
      title: "Low-confidence OCR needs manager review",
      description: "AI confidence for this extracted entry is below the review threshold.",
      recommendation: "Compare the entry against the uploaded source before relying on it.",
      confidence: entry.confidence,
      ruleCode: "TEMP_LOW_CONFIDENCE",
    });
  }

  if (entry.holdingType === "unknown") {
    issues.push({
      severity: "medium",
      type: "ambiguous_holding_type",
      title: "Hot or cold holding type needs manager review",
      description: "AI could not determine whether this check was for hot or cold holding.",
      recommendation: "Classify the holding type before judging the temperature.",
      confidence: entry.confidence,
      ruleCode: "TEMP_UNKNOWN_HOLDING_TYPE",
    });
  }

  let temperatureStatus: ComplianceStatus = "needs_review";
  if (entry.temperatureF !== null && entry.temperatureF !== undefined) {
    if (entry.holdingType === "cold") {
      temperatureStatus = entry.temperatureF <= rules.coldMaxF ? "compliant" : "potential_issue";
    } else if (entry.holdingType === "hot") {
      temperatureStatus = entry.temperatureF >= rules.hotMinF ? "compliant" : "potential_issue";
    }
  }

  if (temperatureStatus === "potential_issue") {
    issues.push({
      severity: "high",
      type: "temperature_threshold",
      title: "Temperature threshold potential issue",
      description:
        entry.holdingType === "cold"
          ? `AI read ${entry.temperatureF}F for cold holding, above the ${rules.coldMaxF}F default threshold.`
          : `AI read ${entry.temperatureF}F for hot holding, below the ${rules.hotMinF}F default threshold.`,
      recommendation: "Review the original log and local food safety rules before taking action.",
      confidence: entry.confidence,
      ruleCode: entry.holdingType === "cold" ? "TEMP_COLD_THRESHOLD" : "TEMP_HOT_THRESHOLD",
    });
  }

  const status: ComplianceStatus =
    issues.length > 0
      ? temperatureStatus === "potential_issue"
        ? "potential_issue"
        : "needs_review"
      : temperatureStatus;

  return { status, issues };
}
