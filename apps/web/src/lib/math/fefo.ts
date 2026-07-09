export interface LotRow {
  sku_id: string;
  lot_id: string;
  mfg_date?: string;
  expiry_date?: string;
  qty: string | number;
  node_id?: string;
  unit_cost_inr?: string | number;
  [key: string]: string | number | undefined;
}

export interface FefoItem {
  sku_id: string;
  lot_id: string;
  node_id: string;
  qty: number;
  expiry_date: string | null;
  days_to_expiry: number | null;
  priority: "critical" | "high" | "medium" | "low" | "none";
  action: string;
  exposure_inr: number;
}

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

export function computeFefoQueue(
  lots: LotRow[],
  opts: { horizonDays?: number; unitCostBySku?: Record<string, number> } = {},
): {
  queue: FefoItem[];
  summary: {
    totalLots: number;
    critical: number;
    high: number;
    exposureInr: number;
    horizonDays: number;
  };
} {
  const horizon = opts.horizonDays ?? 60;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue: FefoItem[] = lots
    .map((lot) => {
      const qty = num(lot.qty);
      const exp = lot.expiry_date?.trim();
      let days: number | null = null;
      let priority: FefoItem["priority"] = "none";
      let action = "Monitor — no expiry tracked";

      if (exp) {
        const d = new Date(exp);
        days = daysBetween(today, d);
        if (days < 0) {
          priority = "critical";
          action = "Quarantine / write-off review";
        } else if (days <= 14) {
          priority = "critical";
          action = "FEFO pick + markdown / alternate channel";
        } else if (days <= 30) {
          priority = "high";
          action = "Reposition to high-velocity node";
        } else if (days <= horizon) {
          priority = "medium";
          action = "Include in replenishment FEFO sort";
        } else {
          priority = "low";
          action = "Standard rotation";
        }
      }

      const unitCost = num(lot.unit_cost_inr) || num(opts.unitCostBySku?.[lot.sku_id]) || 100;
      return {
        sku_id: lot.sku_id,
        lot_id: lot.lot_id,
        node_id: lot.node_id ?? "—",
        qty,
        expiry_date: exp || null,
        days_to_expiry: days,
        priority,
        action,
        exposure_inr: Math.round(qty * unitCost),
      };
    })
    .filter((l) => l.priority !== "none" && l.priority !== "low")
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      const pd = order[a.priority] - order[b.priority];
      if (pd !== 0) return pd;
      return (a.days_to_expiry ?? 9999) - (b.days_to_expiry ?? 9999);
    });

  const exposureInr = queue.reduce((s, i) => s + i.exposure_inr, 0);

  return {
    queue,
    summary: {
      totalLots: lots.length,
      critical: queue.filter((q) => q.priority === "critical").length,
      high: queue.filter((q) => q.priority === "high").length,
      exposureInr,
      horizonDays: horizon,
    },
  };
}

/** Safety stock: simplified normal approximation SS = z * σ * √(LT) */
export function safetyStock(
  avgWeeklyDemand: number,
  demandStdDev: number,
  leadTimeDays: number,
  serviceLevel = 1.65,
): number {
  const ltWeeks = Math.max(leadTimeDays, 1) / 7;
  return Math.ceil(serviceLevel * demandStdDev * Math.sqrt(ltWeeks));
}
