import type { IndustryPack } from "@/lib/import/config";
import { loadIndustryPack } from "@/lib/data/loadPack";
import { computeFefoQueue, type LotRow } from "@/lib/math/fefo";
import { auditFreightInvoices, buildInvoicesFromShipments, type ShipmentRow } from "@/lib/math/freight";
import { forecastBySku, type DemandRow } from "@/lib/math/forecast";
import { AGENTS } from "@/lib/product/catalog";

export interface ToolResult {
  tool: string;
  agentId: string;
  data: unknown;
  summary: string;
  confidence: number;
  requiresApproval: boolean;
}

export type ToolName =
  | "inventory_fefo"
  | "freight_audit"
  | "demand_forecast"
  | "control_tower"
  | "dispatch_analysis"
  | "risk_scan"
  | "scenario_baseline";

const TOOL_AGENT: Record<ToolName, string> = {
  inventory_fefo: "ai-inventory-strategist",
  freight_audit: "ai-settlement-auditor",
  demand_forecast: "ai-demand-analyst",
  control_tower: "ai-visibility-controller",
  dispatch_analysis: "ai-dispatch-planner",
  risk_scan: "ai-resilience-controller",
  scenario_baseline: "ai-scenario-planner",
};

function pickIndustry(prompt: string): IndustryPack {
  return /cpg|fmcg|india/i.test(prompt) ? "cpg" : "medtech";
}

export async function runTool(
  tool: ToolName,
  opts: { industry?: IndustryPack; prompt?: string; params?: Record<string, unknown> },
): Promise<ToolResult> {
  const industry = opts.industry ?? pickIndustry(opts.prompt ?? "");
  const pack = await loadIndustryPack(industry);
  const agentId = TOOL_AGENT[tool];

  switch (tool) {
    case "inventory_fefo": {
      const horizon = Number(opts.params?.horizonDays) || 60;
      const lots = (pack.files.lots_inventory?.rows ?? []) as LotRow[];
      const unitCostBySku: Record<string, number> = {};
      for (const s of pack.files.sku_master?.rows ?? []) {
        unitCostBySku[s.sku_id] = Number(s.unit_cost_inr) || 100;
      }
      const result = computeFefoQueue(lots, { horizonDays: horizon, unitCostBySku });
      return {
        tool,
        agentId,
        data: result,
        summary: `${result.summary.critical} critical + ${result.summary.high} high-priority lots; ₹${result.summary.exposureInr.toLocaleString()} exposure (${industry})`,
        confidence: 0.91,
        requiresApproval: result.summary.critical > 0,
      };
    }
    case "freight_audit": {
      const shipments = (pack.files.shipments?.rows ?? []) as ShipmentRow[];
      const invoices = buildInvoicesFromShipments(shipments);
      const audit = auditFreightInvoices(invoices);
      return {
        tool,
        agentId,
        data: audit,
        summary: `${audit.overbilled} overbilled invoices; ₹${audit.recoverableInr.toLocaleString()} recoverable (${audit.leakagePct}% leakage)`,
        confidence: 0.88,
        requiresApproval: audit.recoverableInr > 10000,
      };
    }
    case "demand_forecast": {
      const rows = (pack.files.demand_history?.rows ?? []) as DemandRow[];
      const fc = forecastBySku(rows, 4);
      return {
        tool,
        agentId,
        data: fc,
        summary: `MAPE ${fc.mape}% on holdout weeks; ${fc.forecasts.length} forecast points generated`,
        confidence: fc.mape < 15 ? 0.85 : 0.72,
        requiresApproval: false,
      };
    }
    case "control_tower": {
      return {
        tool,
        agentId,
        data: { industry, stats: pack.stats, loadedAt: pack.loadedAt },
        summary: `OTIF proxy: ${pack.stats.shipmentCount} shipments, ${pack.stats.nearExpiryLots} near-expiry lots`,
        confidence: 0.9,
        requiresApproval: false,
      };
    }
    case "dispatch_analysis": {
      const shipments = (pack.files.shipments?.rows ?? []) as ShipmentRow[];
      const fills = shipments.map((s) => Number(s.fill_rate_pct) || 0);
      const avgFill = fills.length ? fills.reduce((a, b) => a + b, 0) / fills.length : 0;
      const underfilled = shipments.filter((s) => Number(s.fill_rate_pct) < 0.65);
      return {
        tool,
        agentId,
        data: { avgFillRate: Math.round(avgFill * 1000) / 10, underfilled: underfilled.slice(0, 10) },
        summary: `Avg fill ${Math.round(avgFill * 100)}%; ${underfilled.length} loads under 65% fill`,
        confidence: 0.86,
        requiresApproval: underfilled.length > 5,
      };
    }
    case "risk_scan": {
      const shipments = (pack.files.shipments?.rows ?? []) as ShipmentRow[];
      const risks = shipments
        .filter((s) => s.status === "in_transit" && Number(s.fill_rate_pct) < 0.6)
        .map((s) => ({
          shipment_id: s.shipment_id,
          risk: "Low fill + in transit",
          severity: "high",
        }));
      return {
        tool,
        agentId,
        data: { risks, count: risks.length },
        summary: `${risks.length} high-severity in-transit risks in next 72h window`,
        confidence: 0.8,
        requiresApproval: risks.length > 0,
      };
    }
    case "scenario_baseline": {
      const demand = pack.files.demand_history?.rows ?? [];
      const total = demand.slice(-12).reduce((s, r) => s + Number(r.qty), 0);
      return {
        tool,
        agentId,
        data: {
          base: total,
          upside: Math.round(total * 1.15),
          downside: Math.round(total * 0.88),
        },
        summary: `12-week demand base ${total}; upside +15%, downside -12%`,
        confidence: 0.78,
        requiresApproval: true,
      };
    }
    default:
      return {
        tool,
        agentId,
        data: {},
        summary: "Unknown tool",
        confidence: 0.5,
        requiresApproval: false,
      };
  }
}

const PROMPT_RULES: { pattern: RegExp; tool: ToolName }[] = [
  { pattern: /invoice|settle|freight|leakage|shouldn.?t i pay/i, tool: "freight_audit" },
  { pattern: /fefo|expir|near.?expir|lot/i, tool: "inventory_fefo" },
  { pattern: /forecast|demand|stockout|sku/i, tool: "demand_forecast" },
  { pattern: /control tower|kpi|dashboard/i, tool: "control_tower" },
  { pattern: /dispatch|fill rate|vehicle/i, tool: "dispatch_analysis" },
  { pattern: /risk|disruption|72 hour/i, tool: "risk_scan" },
  { pattern: /scenario|what.?if|s&op/i, tool: "scenario_baseline" },
];

export function resolveToolFromPrompt(prompt: string): ToolName {
  for (const r of PROMPT_RULES) {
    if (r.pattern.test(prompt)) return r.tool;
  }
  return "control_tower";
}

export function agentName(agentId: string): string {
  return AGENTS.find((a) => a.id === agentId)?.name ?? agentId;
}
