export type PainStatus = "live" | "partial" | "data_only" | "planned";

export interface PainItem {
  id: number;
  module: string;
  pain: string;
  status: PainStatus;
  how: string;
  phase: string;
}

/** Yugam V1 pains — honest build status as of P1 scaffold */
export const PAIN_MAP: PainItem[] = [
  { id: 1, module: "M1", pain: "Forecast accuracy poor; Excel misses demand shifts", status: "planned", how: "Prophet + WAPE dashboard (P3)", phase: "P3" },
  { id: 6, module: "M1", pain: "Forecast in silos — sales, finance, SC disagree", status: "planned", how: "Single forecast workspace + version compare", phase: "P3" },
  { id: 7, module: "M1", pain: "No MAPE accountability by planner", status: "planned", how: "MAPE leaderboard by SKU/planner", phase: "P3" },
  { id: 8, module: "M2", pain: "Stockouts on fast movers, slow movers pile up", status: "data_only", how: "ABC classes in starter data; optimizer P4", phase: "P4" },
  { id: 10, module: "M2", pain: "Excess & obsolete inventory eats margin", status: "data_only", how: "E&O flags in inventory pack; rules P4", phase: "P4" },
  { id: 11, module: "M2", pain: "Near-expiry stock found too late (FEFO)", status: "partial", how: "Near-expiry count on dashboard; FEFO queue P1.2", phase: "P1" },
  { id: 16, module: "M2", pain: "Shortage allocation is political", status: "data_only", how: "allocation_rules.csv in pack; engine P4", phase: "P4" },
  { id: 18, module: "M3", pain: "No auto-indent — manual PO/STO", status: "planned", how: "ROP/ROQ replenishment engine", phase: "P4" },
  { id: 21, module: "M3", pain: "No exception management", status: "planned", how: "Exception inbox ranked by $ impact", phase: "P4" },
  { id: 23, module: "M4", pain: "Freight cost varies by planner", status: "planned", how: "OR-Tools VRP baseline vs actual", phase: "P5" },
  { id: 24, module: "M4", pain: "Vehicles dispatched underfilled", status: "planned", how: "Fill-rate KPI + load builder", phase: "P5" },
  { id: 26, module: "M4", pain: "Route selection is habit not optimization", status: "planned", how: "Multi-drop VRP (OR-Tools)", phase: "P5" },
  { id: 30, module: "M4", pain: "No dispatch plan-vs-actual", status: "data_only", how: "shipments.csv PVA; alerts P5", phase: "P5" },
  { id: 38, module: "M6", pain: "No control tower — 14 spreadsheets", status: "partial", how: "Dashboard aggregates MedTech + CPG packs", phase: "P1" },
  { id: 39, module: "M5", pain: "Where's my order? takes hours", status: "partial", how: "Copilot Q&A (needs Railway backend)", phase: "P0" },
  { id: 40, module: "M6", pain: "KPIs assembled manually, stale", status: "partial", how: "Auto-loaded KPI tiles on dashboard", phase: "P1" },
  { id: 43, module: "M6", pain: "OTIF disputes — no single truth", status: "data_only", how: "Shared shipment + order facts in DB", phase: "P2" },
  { id: 46, module: "M5", pain: "Every insight needs an analyst", status: "partial", how: "Copilot over imported/auto data", phase: "P0" },
  { id: 48, module: "M5", pain: "What-if scenarios take a week", status: "planned", how: "Scenario sandbox + Copilot narrative", phase: "P6" },
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
