/** Heuristic engines for remaining Yugam modules (Enmovil-parity math layer). */

import {
  severityFromExposure,
  type TowerException,
} from "@/lib/math/exceptions";

export type Row = Record<string, string | number | undefined>;

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const VEHICLE_CAP: Record<string, { weightKg: number; volumeM3: number }> = {
  "407": { weightKg: 2500, volumeM3: 12 },
  "14ft": { weightKg: 4000, volumeM3: 18 },
  "20ft": { weightKg: 7000, volumeM3: 28 },
  "32ft": { weightKg: 12000, volumeM3: 45 },
};

function vehicleCap(type: string) {
  return VEHICLE_CAP[type] ?? VEHICLE_CAP["14ft"]!;
}

/** Rough-cut capacity: weekly demand vs plant throughput heuristic. */
export function computeRccp(opts: {
  demand: Row[];
  nodes: Row[];
  weeklyCapacityUnits?: number;
}) {
  const plants = opts.nodes.filter((n) => String(n.node_type).toLowerCase() === "plant");
  const plantCount = Math.max(plants.length, 1);
  const weeklyCap = opts.weeklyCapacityUnits ?? plantCount * 5000;

  const byWeek = new Map<string, number>();
  for (const r of opts.demand) {
    const w = String(r.week_start ?? "");
    if (!w) continue;
    byWeek.set(w, (byWeek.get(w) ?? 0) + num(r.qty));
  }
  const weeks = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, load]) => {
      const util = weeklyCap > 0 ? load / weeklyCap : 0;
      return {
        week,
        load: Math.round(load * 10) / 10,
        capacity: weeklyCap,
        util_pct: Math.round(util * 1000) / 10,
        status: util > 1.05 ? "overload" : util > 0.85 ? "tight" : "ok",
      };
    });

  const overloads = weeks.filter((w) => w.status === "overload").length;
  const avgUtil =
    weeks.length > 0 ? weeks.reduce((s, w) => s + w.util_pct, 0) / weeks.length : 0;

  return {
    plants: plants.map((p) => ({ node_id: p.node_id, city: p.city })),
    weeks,
    summary: {
      plantCount,
      weeklyCapacity: weeklyCap,
      avgUtilPct: Math.round(avgUtil * 10) / 10,
      overloadWeeks: overloads,
    },
  };
}

/** Production plan from open orders + MOQ / lead time on SKUs. */
export function computeProductionPlan(opts: { orders: Row[]; skus: Row[] }) {
  const skuMap = new Map(opts.skus.map((s) => [String(s.sku_id), s]));
  const open = opts.orders.filter((o) => String(o.status).toLowerCase() === "open");

  const bySku = new Map<string, number>();
  for (const o of open) {
    const id = String(o.sku_id);
    bySku.set(id, (bySku.get(id) ?? 0) + num(o.qty));
  }

  const plan = Array.from(bySku.entries())
    .map(([sku_id, need]) => {
      const sku = skuMap.get(sku_id);
      const moq = Math.max(1, num(sku?.moq));
      const lead = num(sku?.lead_time_days) || 14;
      const qty = Math.ceil(need / moq) * moq;
      return {
        sku_id,
        demand_open: need,
        moq,
        planned_qty: qty,
        lead_time_days: lead,
        start_by: new Date(Date.now() + lead * 0.4 * 86400000).toISOString().slice(0, 10),
        priority: need > moq * 3 ? "high" : "normal",
      };
    })
    .sort((a, b) => b.demand_open - a.demand_open)
    .slice(0, 25);

  return {
    plan,
    summary: {
      openOrders: open.length,
      skusPlanned: plan.length,
      highPriority: plan.filter((p) => p.priority === "high").length,
      totalPlannedQty: plan.reduce((s, p) => s + p.planned_qty, 0),
    },
  };
}

/** Warehouse dock slotting from shipment origins. */
export function computeWarehousePlan(opts: { shipments: Row[]; nodes: Row[] }) {
  const warehouses = opts.nodes.filter((n) =>
    /dc|wh|warehouse|cfa/i.test(String(n.node_type) + String(n.node_id)),
  );
  const docksPerWh = 4;
  const byOrigin = new Map<string, number>();
  for (const s of opts.shipments) {
    const o = String(s.origin_node_id ?? "UNKNOWN");
    byOrigin.set(o, (byOrigin.get(o) ?? 0) + 1);
  }

  const slots = Array.from(byOrigin.entries())
    .map(([node_id, loads]) => {
      const dockNeed = Math.min(docksPerWh, Math.ceil(loads / 3));
      const util = dockNeed / docksPerWh;
      return {
        node_id,
        outbound_loads: loads,
        docks_assigned: dockNeed,
        docks_available: docksPerWh,
        util_pct: Math.round(util * 1000) / 10,
        action: util > 0.9 ? "Add overtime / flex dock" : "On plan",
      };
    })
    .sort((a, b) => b.outbound_loads - a.outbound_loads);

  return {
    warehouses: warehouses.map((w) => ({ node_id: w.node_id, city: w.city })),
    slots: slots.slice(0, 20),
    summary: {
      warehouseCount: warehouses.length || slots.length,
      hotNodes: slots.filter((s) => s.util_pct >= 90).length,
      totalLoads: opts.shipments.length,
    },
  };
}

/** First-fit decreasing 3D/weight load builder for open order lines. */
export function computeLoadBuild(opts: { orders: Row[]; skus: Row[]; vehicleType?: string }) {
  const vType = opts.vehicleType ?? "14ft";
  const cap = vehicleCap(vType);
  const skuMap = new Map(opts.skus.map((s) => [String(s.sku_id), s]));

  const lines = opts.orders
    .filter((o) => String(o.status).toLowerCase() === "open")
    .map((o) => {
      const sku = skuMap.get(String(o.sku_id));
      const qty = num(o.qty);
      return {
        order_id: String(o.order_id),
        sku_id: String(o.sku_id),
        qty,
        weight_kg: qty * (num(sku?.weight_kg) || 5),
        volume_m3: qty * (num(sku?.volume_m3) || 0.02),
      };
    })
    .sort((a, b) => b.volume_m3 - a.volume_m3);

  const loads: {
    load_id: string;
    vehicle_type: string;
    lines: typeof lines;
    weight_kg: number;
    volume_m3: number;
    fill_pct: number;
  }[] = [];

  let cur = {
    load_id: "LOAD-001",
    vehicle_type: vType,
    lines: [] as typeof lines,
    weight_kg: 0,
    volume_m3: 0,
    fill_pct: 0,
  };

  for (const line of lines.slice(0, 40)) {
    if (
      cur.weight_kg + line.weight_kg > cap.weightKg ||
      cur.volume_m3 + line.volume_m3 > cap.volumeM3
    ) {
      cur.fill_pct = Math.round(
        Math.max(cur.weight_kg / cap.weightKg, cur.volume_m3 / cap.volumeM3) * 1000,
      ) / 10;
      loads.push(cur);
      cur = {
        load_id: `LOAD-${String(loads.length + 1).padStart(3, "0")}`,
        vehicle_type: vType,
        lines: [],
        weight_kg: 0,
        volume_m3: 0,
        fill_pct: 0,
      };
    }
    cur.lines.push(line);
    cur.weight_kg += line.weight_kg;
    cur.volume_m3 += line.volume_m3;
  }
  if (cur.lines.length) {
    cur.fill_pct =
      Math.round(
        Math.max(cur.weight_kg / cap.weightKg, cur.volume_m3 / cap.volumeM3) * 1000,
      ) / 10;
    loads.push(cur);
  }

  const avgFill =
    loads.length > 0 ? loads.reduce((s, l) => s + l.fill_pct, 0) / loads.length : 0;

  return {
    capacity: { vehicle_type: vType, ...cap },
    loads: loads.map((l) => ({
      load_id: l.load_id,
      vehicle_type: l.vehicle_type,
      line_count: l.lines.length,
      weight_kg: Math.round(l.weight_kg * 10) / 10,
      volume_m3: Math.round(l.volume_m3 * 1000) / 1000,
      fill_pct: l.fill_pct,
    })),
    summary: {
      loads: loads.length,
      avgFillPct: Math.round(avgFill * 10) / 10,
      linesPacked: lines.slice(0, 40).length,
    },
  };
}

/** Fleet sizing from shipment vehicle mix + underfill. */
export function computeFleetSize(opts: { shipments: Row[] }) {
  const byType = new Map<string, { count: number; fillSum: number }>();
  for (const s of opts.shipments) {
    const t = String(s.vehicle_type || "14ft");
    const cur = byType.get(t) ?? { count: 0, fillSum: 0 };
    cur.count += 1;
    cur.fillSum += num(s.fill_rate_pct);
    byType.set(t, cur);
  }

  const mix = Array.from(byType.entries()).map(([vehicle_type, v]) => {
    const avgFill = v.count ? v.fillSum / v.count : 0;
    const recommended = avgFill < 0.65 ? Math.ceil(v.count * 0.85) : v.count;
    return {
      vehicle_type,
      current_trips: v.count,
      avg_fill_pct: Math.round(avgFill * 1000) / 10,
      recommended_fleet: recommended,
      action:
        avgFill < 0.65
          ? "Downsize / consolidate routes"
          : avgFill > 0.92
            ? "Add capacity"
            : "Hold",
    };
  });

  return {
    mix,
    summary: {
      vehicleTypes: mix.length,
      totalTrips: opts.shipments.length,
      consolidateCandidates: mix.filter((m) => m.action.startsWith("Downsize")).length,
    },
  };
}

/** Multi-criteria RFQ scoring (synthetic carrier bids from lanes). */
export function computeRfqScore(opts: { shipments: Row[] }) {
  const carriers = ["BlueDart", "Delhivery", "Gati", "TCI"];
  const lanes = opts.shipments.slice(0, 12).map((s, i) => {
    const base = 8000 + (num(s.fill_rate_pct) || 0.7) * 4000;
    const bids = carriers.map((carrier, ci) => {
      const price = Math.round(base * (0.88 + ((i + ci) % 5) * 0.04));
      const otif = 88 + ((i + ci * 3) % 10);
      const transitDays = 2 + ((i + ci) % 4);
      const score = Math.round(otif * 0.5 + (10000 / price) * 30 + (5 - transitDays) * 4);
      return { carrier, price_inr: price, otif_pct: otif, transit_days: transitDays, score };
    });
    bids.sort((a, b) => b.score - a.score);
    return {
      shipment_id: s.shipment_id,
      origin: s.origin_node_id,
      dest_pincode: s.dest_pincode,
      winner: bids[0]!.carrier,
      best_score: bids[0]!.score,
      bids,
    };
  });

  const savings = lanes.reduce((s, l) => {
    const best = l.bids[0]!.price_inr;
    const worst = l.bids[l.bids.length - 1]!.price_inr;
    return s + (worst - best);
  }, 0);

  return {
    lanes,
    summary: {
      rfqs: lanes.length,
      estimatedSavingsInr: savings,
      topCarrier: carriers[0],
    },
  };
}

/** ETA prediction from dispatch date + pincode distance proxy. */
export function computeEta(opts: { shipments: Row[]; now?: Date }) {
  const now = opts.now ?? new Date();
  const rows = opts.shipments
    .filter((s) => /in_transit|dispatched|pending/i.test(String(s.status)))
    .map((s) => {
      const pin = num(s.dest_pincode);
      const transitHours = 18 + (pin % 100) / 5;
      const dispatch = s.dispatch_date ? new Date(String(s.dispatch_date)) : now;
      const eta = new Date(dispatch.getTime() + transitHours * 3600000);
      const delayHours = Math.max(0, (now.getTime() - eta.getTime()) / 3600000);
      return {
        shipment_id: s.shipment_id,
        status: s.status,
        vehicle_type: s.vehicle_type,
        dest_pincode: s.dest_pincode,
        eta: eta.toISOString(),
        delay_hours: Math.round(delayHours * 10) / 10,
        risk: delayHours > 6 ? "late" : delayHours > 0 ? "at_risk" : "on_time",
      };
    })
    .sort((a, b) => b.delay_hours - a.delay_hours);

  return {
    etas: rows.slice(0, 25),
    summary: {
      tracked: rows.length,
      late: rows.filter((r) => r.risk === "late").length,
      atRisk: rows.filter((r) => r.risk === "at_risk").length,
      onTime: rows.filter((r) => r.risk === "on_time").length,
    },
  };
}

/** ePOD validation checklist on shipments. */
export function computeEpod(opts: { shipments: Row[] }) {
  const checks = opts.shipments.slice(0, 30).map((s) => {
    const eway = Boolean(String(s.eway_bill_number ?? "").trim());
    const delivered = String(s.status).toLowerCase() === "delivered";
    const hasVehicle = Boolean(String(s.vehicle_number ?? "").trim());
    const issues: string[] = [];
    if (!eway) issues.push("missing_eway");
    if (!hasVehicle) issues.push("missing_vehicle");
    if (delivered && !eway) issues.push("pod_without_eway");
    return {
      shipment_id: s.shipment_id,
      status: s.status,
      eway_ok: eway,
      vehicle_ok: hasVehicle,
      pod_ready: delivered && eway && hasVehicle,
      issues,
      action: issues.length ? "Request driver upload / gate hold" : "Clear for settlement",
    };
  });

  const blockers = checks.filter((c) => c.issues.length > 0).length;
  return {
    checks,
    summary: {
      reviewed: checks.length,
      blockers,
      podReady: checks.filter((c) => c.pod_ready).length,
    },
  };
}

/** Control tower exception inbox from pack + other engines. */
export function computeControlTower(opts: {
  stats: {
    shipmentCount: number;
    nearExpiryLots: number;
    skuCount: number;
    orderCount: number;
  };
  fefoCritical: number;
  fefoExposureInr?: number;
  freightRecoverable: number;
  lateEtas: number;
  underfilled: number;
  industry: string;
  loadedAt: string;
  dataSource?: "supabase" | "csv";
  pendingApprovals?: TowerException[];
}) {
  const mathExceptions: TowerException[] = [];

  if (opts.fefoCritical > 0) {
    mathExceptions.push({
      id: "EX-FEFO",
      severity:
        opts.fefoExposureInr != null
          ? severityFromExposure(opts.fefoExposureInr)
          : "critical",
      taxonomy: "expiry_risk",
      module: "inventory-optimisation",
      title: `${opts.fefoCritical} lots need FEFO action`,
      owner: "ai-inventory-strategist",
      financialInr: opts.fefoExposureInr,
      source: "math",
    });
  }
  if (opts.freightRecoverable > 10000) {
    mathExceptions.push({
      id: "EX-FRT",
      severity: severityFromExposure(opts.freightRecoverable),
      taxonomy: "freight_variance",
      module: "freight-settlement",
      title: `₹${opts.freightRecoverable.toLocaleString()} recoverable freight`,
      owner: "ai-settlement-auditor",
      financialInr: opts.freightRecoverable,
      source: "math",
    });
  }
  if (opts.lateEtas > 0) {
    mathExceptions.push({
      id: "EX-ETA",
      severity: "high",
      taxonomy: "delay_transit",
      module: "eta-prediction",
      title: `${opts.lateEtas} late ETAs`,
      owner: "ai-visibility-controller",
      source: "math",
    });
  }
  if (opts.underfilled > 5) {
    mathExceptions.push({
      id: "EX-DSP",
      severity: "medium",
      taxonomy: "capacity",
      module: "dispatch-planning",
      title: `${opts.underfilled} underfilled dispatches`,
      owner: "ai-dispatch-planner",
      source: "math",
    });
  }
  if (opts.stats.nearExpiryLots > 0) {
    mathExceptions.push({
      id: "EX-EXP",
      severity: "medium",
      taxonomy: "expiry_risk",
      module: "inventory-optimisation",
      title: `${opts.stats.nearExpiryLots} near-expiry lots (60d)`,
      owner: "ai-inventory-strategist",
      source: "math",
    });
  }

  const approvals = opts.pendingApprovals ?? [];
  const exceptions = [...approvals, ...mathExceptions];

  return {
    industry: opts.industry,
    loadedAt: opts.loadedAt,
    dataSource: opts.dataSource ?? "csv",
    stats: opts.stats,
    exceptions,
    summary: {
      openExceptions: exceptions.length,
      critical: exceptions.filter((e) => e.severity === "critical").length,
      pendingApprovals: approvals.length,
      shipmentCount: opts.stats.shipmentCount,
    },
  };
}
