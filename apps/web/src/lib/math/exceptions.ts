/**
 * Logistics exception taxonomy (delay, damage, shortage, freight variance, expiry).
 * Severity axes from logistics-exception-management skill.
 */

export type ExceptionTaxonomy =
  | "delay_transit"
  | "damage_visible"
  | "shortage"
  | "freight_variance"
  | "expiry_risk"
  | "capacity"
  | "approval_gate"
  | "other";

export type ExceptionSeverity = "critical" | "high" | "medium" | "low";

export interface TowerException {
  id: string;
  severity: ExceptionSeverity;
  taxonomy: ExceptionTaxonomy;
  module: string;
  title: string;
  owner: string;
  financialInr?: number;
  source?: "math" | "agent_execution";
  executionId?: string;
}

/** Map financial exposure → severity level (skill Level 1–5 compressed to 4). */
export function severityFromExposure(inr: number): ExceptionSeverity {
  if (inr >= 100_000) return "critical";
  if (inr >= 25_000) return "high";
  if (inr >= 5_000) return "medium";
  return "low";
}

export function classifyToolException(
  toolName: string,
  summary: string,
  exposureInr?: number,
): { taxonomy: ExceptionTaxonomy; severity: ExceptionSeverity } {
  const t = toolName.toLowerCase();
  if (t.includes("fefo") || t.includes("inventory")) {
    return {
      taxonomy: "expiry_risk",
      severity: exposureInr != null ? severityFromExposure(exposureInr) : "high",
    };
  }
  if (t.includes("freight") || t.includes("audit")) {
    return {
      taxonomy: "freight_variance",
      severity: exposureInr != null ? severityFromExposure(exposureInr) : "high",
    };
  }
  if (t.includes("eta") || /late|delay/i.test(summary)) {
    return { taxonomy: "delay_transit", severity: "high" };
  }
  if (t.includes("dispatch") || t.includes("load") || t.includes("fleet")) {
    return { taxonomy: "capacity", severity: "medium" };
  }
  if (t.includes("epod") || /damage|shortage|short/i.test(summary)) {
    return {
      taxonomy: /damage/i.test(summary) ? "damage_visible" : "shortage",
      severity: "high",
    };
  }
  return { taxonomy: "other", severity: "medium" };
}
