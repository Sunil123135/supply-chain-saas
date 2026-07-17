export type PainStatus = "live" | "partial" | "data_only" | "planned";

export interface PainItem {
  id: number;
  module: string;
  pain: string;
  status: PainStatus;
  how: string;
  phase: string;
}

/** Yugam V1 pains — status after P4 product-depth + OR layer */
export const PAIN_MAP: PainItem[] = [
  { id: 1, module: "M1", pain: "Forecast accuracy poor; Excel misses demand shifts", status: "partial", how: "ETS/Prophet/Croston + WAPE dashboard + auto picker (P3 live)", phase: "P3" },
  { id: 6, module: "M1", pain: "Forecast in silos — sales, finance, SC disagree", status: "partial", how: "forecast_compare tool (sales/ops/finance versions)", phase: "P4" },
  { id: 7, module: "M1", pain: "No MAPE accountability by planner", status: "partial", how: "MAPE leaderboard by planner in forecast_compare", phase: "P4" },
  { id: 8, module: "M2", pain: "Stockouts on fast movers, slow movers pile up", status: "partial", how: "MEIO + newsvendor + ROP auto-indent (OR layer)", phase: "P4" },
  { id: 10, module: "M2", pain: "Excess & obsolete inventory eats margin", status: "partial", how: "eo_aging liquidation rules", phase: "P4" },
  { id: 11, module: "M2", pain: "Near-expiry stock found too late (FEFO)", status: "partial", how: "FEFO queue + E&O near-expiry flags", phase: "P1" },
  { id: 16, module: "M2", pain: "Shortage allocation is political", status: "partial", how: "atp_allocate by customer tier + allocation_rules", phase: "P4" },
  { id: 18, module: "M3", pain: "No auto-indent — manual PO/STO", status: "partial", how: "ROP breach → auto-indent proposals", phase: "P4" },
  { id: 21, module: "M3", pain: "No exception management", status: "partial", how: "Control Tower + approvals inbox", phase: "P2" },
  { id: 23, module: "M4", pain: "Freight cost varies by planner", status: "partial", how: "CVRP + OR-Tools when optimizer has ortools", phase: "P5" },
  { id: 24, module: "M4", pain: "Vehicles dispatched underfilled", status: "partial", how: "Fill-rate KPI + 3D load builder", phase: "P5" },
  { id: 26, module: "M4", pain: "Route selection is habit not optimization", status: "partial", how: "Multi-drop CVRP (local + /api/vrp/solve)", phase: "P5" },
  { id: 30, module: "M4", pain: "No dispatch plan-vs-actual", status: "partial", how: "plan_vs_actual + dispatch_analysis", phase: "P4" },
  { id: 38, module: "M6", pain: "No control tower — 14 spreadsheets", status: "live", how: "Dashboard + agent_executions + approvals", phase: "P2" },
  { id: 39, module: "M5", pain: "Where's my order? takes hours", status: "partial", how: "track_trace + Slack/Teams/WhatsApp bots", phase: "P4" },
  { id: 40, module: "M6", pain: "KPIs assembled manually, stale", status: "partial", how: "Auto-loaded KPI tiles + agent schedule KPIs", phase: "P4" },
  { id: 43, module: "M6", pain: "OTIF disputes — no single truth", status: "partial", how: "track_trace milestones + plan_vs_actual", phase: "P4" },
  { id: 46, module: "M5", pain: "Every insight needs an analyst", status: "partial", how: "Sarvam + Dify RAG narrative layer", phase: "P2" },
  { id: 48, module: "M5", pain: "What-if scenarios take a week", status: "partial", how: "network MIP + scenario_baseline + morning brief", phase: "P4" },
];

export function statusLabel(s: PainStatus): string {
  switch (s) {
    case "live":
      return "Live";
    case "partial":
      return "Partial";
    case "data_only":
      return "Data ready";
    case "planned":
      return "Planned";
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
