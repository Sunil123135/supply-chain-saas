/** Product-depth engines — ATP, lot mortgage, E&O, cold-chain, track-trace, PVA, forecast compare. */

export type Row = Record<string, string | number | undefined>;

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: string | number | undefined): string {
  return String(v ?? "");
}

const TIER_RANK: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };

/** ATP / shortage allocation by customer tier + allocation_rules. */
export function computeAtpAllocation(opts: {
  orders: Row[];
  lots: Row[];
  customers: Row[];
  skus: Row[];
  rules: Row[];
}) {
  const customerTier = new Map(
    opts.customers.map((c) => [str(c.customer_id), str(c.tier || "C").toUpperCase()]),
  );
  const skuAbc = new Map(
    opts.skus.map((s) => [str(s.sku_id), str(s.abc_class || "B").toUpperCase()]),
  );
  const supply = new Map<string, number>();
  for (const lot of opts.lots) {
    const id = str(lot.sku_id);
    supply.set(id, (supply.get(id) ?? 0) + num(lot.qty || lot.qty_on_hand));
  }

  const open = opts.orders.filter((o) => {
    const st = str(o.status).toLowerCase();
    return !st || st === "open" || st === "confirmed" || st === "allocated";
  });

  // Sort orders: tier A first, then A SKUs, then larger qty
  const ranked = [...open].sort((a, b) => {
    const ta = TIER_RANK[customerTier.get(str(a.customer_id)) ?? "C"] ?? 9;
    const tb = TIER_RANK[customerTier.get(str(b.customer_id)) ?? "C"] ?? 9;
    if (ta !== tb) return ta - tb;
    const aa = skuAbc.get(str(a.sku_id)) ?? "B";
    const ab = skuAbc.get(str(b.sku_id)) ?? "B";
    if (aa !== ab) return (TIER_RANK[aa] ?? 9) - (TIER_RANK[ab] ?? 9);
    return num(b.qty) - num(a.qty);
  });

  function maxShortage(tier: string, abc: string): number {
    const rule = opts.rules.find(
      (r) =>
        str(r.customer_tier).toUpperCase() === tier &&
        str(r.sku_abc_class).toUpperCase() === abc,
    );
    if (rule) return num(rule.max_shortage_pct) / 100;
    if (tier === "A") return abc === "A" ? 0 : 0.1;
    if (tier === "B") return 0.15;
    return 0.4;
  }

  const remaining = new Map(supply);
  const allocations = [];
  let shorted = 0;
  let fullyMet = 0;

  for (const o of ranked.slice(0, 80)) {
    const sku = str(o.sku_id);
    const demand = num(o.qty);
    const tier = customerTier.get(str(o.customer_id)) ?? "C";
    const abc = skuAbc.get(sku) ?? "B";
    const avail = remaining.get(sku) ?? 0;
    const maxShort = maxShortage(tier, abc);
    const minMustFill = demand * (1 - maxShort);
    const allocated = Math.min(avail, demand);
    const shortfall = Math.max(0, demand - allocated);
    const status =
      shortfall <= 0
        ? "fulfilled"
        : allocated >= minMustFill
          ? "partial_ok"
          : "breach";
    if (status === "fulfilled") fullyMet += 1;
    if (shortfall > 0) shorted += 1;
    remaining.set(sku, avail - allocated);
    allocations.push({
      order_id: str(o.order_id),
      customer_id: str(o.customer_id),
      customer_tier: tier,
      sku_id: sku,
      abc_class: abc,
      demand,
      allocated: Math.round(allocated * 10) / 10,
      shortfall: Math.round(shortfall * 10) / 10,
      max_shortage_pct: Math.round(maxShort * 1000) / 10,
      status,
    });
  }

  const breaches = allocations.filter((a) => a.status === "breach");
  return {
    engine: "atp-tier-allocation",
    allocations,
    summary: {
      orders: allocations.length,
      fullyMet,
      shorted,
      breaches: breaches.length,
      supplySkus: supply.size,
    },
  };
}

/** Lot mortgage — reserve continuous lots for key (tier A) hospital accounts. */
export function computeLotMortgage(opts: {
  lots: Row[];
  customers: Row[];
  orders: Row[];
  skus: Row[];
  horizonMonths?: number;
}) {
  const horizon = opts.horizonMonths ?? 3;
  const keyCustomers = opts.customers.filter((c) => str(c.tier).toUpperCase() === "A");
  const skuShelf = new Map(
    opts.skus.map((s) => [str(s.sku_id), num(s.shelf_life_days) || 365]),
  );

  // Demand by customer×sku from open orders
  const demandKey = new Map<string, number>();
  for (const o of opts.orders) {
    const cid = str(o.customer_id);
    if (!keyCustomers.some((c) => str(c.customer_id) === cid)) continue;
    const key = `${cid}|${str(o.sku_id)}`;
    demandKey.set(key, (demandKey.get(key) ?? 0) + num(o.qty));
  }

  // Prefer longest remaining shelf life lots (continuity) — avoid near-expiry for key accounts
  const lotsBySku = new Map<string, Row[]>();
  for (const lot of opts.lots) {
    const id = str(lot.sku_id);
    const list = lotsBySku.get(id) ?? [];
    list.push(lot);
    lotsBySku.set(id, list);
  }

  const today = Date.now();
  const mortgages = [];
  for (const [key, qtyNeed] of Array.from(demandKey.entries()).slice(0, 40)) {
    const [customerId, skuId] = key.split("|");
    const lots: Array<Row & { daysLeft: number }> = (lotsBySku.get(skuId!) ?? [])
      .map((l) => {
        const exp = str(l.expiry_date);
        const shelf = skuShelf.get(skuId!) ?? 365;
        const mfg = str(l.mfg_date);
        let daysLeft = shelf;
        if (exp) {
          daysLeft = Math.max(0, (new Date(exp).getTime() - today) / 86400000);
        } else if (mfg) {
          daysLeft = Math.max(
            0,
            shelf - (today - new Date(mfg).getTime()) / 86400000,
          );
        }
        return { ...l, daysLeft };
      })
      .sort((a, b) => b.daysLeft - a.daysLeft);

    let need = qtyNeed * horizon; // rough multi-month cover
    const reserved = [];
    for (const lot of lots) {
      if (need <= 0) break;
      if (lot.daysLeft < 60) continue; // don't mortgage near-expiry
      const take = Math.min(num(lot.qty), need);
      if (take <= 0) continue;
      reserved.push({
        lot_id: str(lot.lot_id),
        node_id: str(lot.node_id),
        qty: Math.round(take * 10) / 10,
        days_to_expiry: Math.round(lot.daysLeft),
      });
      need -= take;
    }
    const covered = qtyNeed * horizon - need;
    mortgages.push({
      customer_id: customerId,
      sku_id: skuId,
      months_cover_target: horizon,
      demand_monthly: qtyNeed,
      reserved_qty: Math.round(covered * 10) / 10,
      lots: reserved,
      continuity_ok: reserved.length <= 2 && need <= 0,
      gap_qty: Math.round(Math.max(0, need) * 10) / 10,
      notify_lot_change: reserved.length > 2,
    });
  }

  mortgages.sort((a, b) => b.gap_qty - a.gap_qty);
  return {
    engine: "lot-mortgage",
    mortgages,
    summary: {
      keyAccounts: keyCustomers.length,
      mortgages: mortgages.length,
      continuityOk: mortgages.filter((m) => m.continuity_ok).length,
      gaps: mortgages.filter((m) => m.gap_qty > 0).length,
      lotChangeAlerts: mortgages.filter((m) => m.notify_lot_change).length,
    },
  };
}

/** E&O / aging liquidation — near-expiry, slow-moving, obsolete. */
export function computeEoAging(opts: {
  lots: Row[];
  skus: Row[];
  demand: Row[];
  unitCostBySku?: Record<string, number>;
}) {
  const demandBySku = new Map<string, number>();
  for (const r of opts.demand.slice(-12)) {
    const id = str(r.sku_id);
    demandBySku.set(id, (demandBySku.get(id) ?? 0) + num(r.qty));
  }
  const avgWeekly = new Map<string, number>();
  for (const [id, total] of Array.from(demandBySku.entries())) {
    avgWeekly.set(id, total / 12);
  }

  const skuMeta = new Map(opts.skus.map((s) => [str(s.sku_id), s]));
  const today = Date.now();
  const flags = [];

  for (const lot of opts.lots) {
    const sku = str(lot.sku_id);
    const qty = num(lot.qty || lot.qty_on_hand);
    if (qty <= 0) continue;
    const meta = skuMeta.get(sku);
    const cost = opts.unitCostBySku?.[sku] ?? num(meta?.unit_cost_inr) ?? num(meta?.unit_cost) ?? 100;
    const shelf = num(meta?.shelf_life_days) || 365;
    const exp = str(lot.expiry_date);
    const mfg = str(lot.mfg_date);
    let daysLeft = shelf;
    if (exp) daysLeft = Math.max(0, (new Date(exp).getTime() - today) / 86400000);
    else if (mfg) daysLeft = Math.max(0, shelf - (today - new Date(mfg).getTime()) / 86400000);

    const weekly = avgWeekly.get(sku) ?? 0;
    const doi = weekly > 0 ? qty / weekly : 999;
    let reason: string | null = null;
    let action = "hold";
    if (daysLeft <= 45) {
      reason = "near_expiry";
      action = "liquidate_priority";
    } else if (doi > 26 && weekly < 1) {
      reason = "obsolete";
      action = "write_down";
    } else if (doi > 16) {
      reason = "slow_moving";
      action = "transfer_or_promo";
    }
    if (!reason) continue;
    flags.push({
      sku_id: sku,
      lot_id: str(lot.lot_id),
      node_id: str(lot.node_id),
      qty,
      days_to_expiry: Math.round(daysLeft),
      days_of_inventory: Math.round(doi * 10) / 10,
      reason,
      action,
      exposure_inr: Math.round(qty * cost),
      liquidation_channel:
        reason === "near_expiry" ? "secondary_distributor" : "promo_bundle",
    });
  }

  flags.sort((a, b) => b.exposure_inr - a.exposure_inr);
  const exposure = flags.reduce((s, f) => s + f.exposure_inr, 0);
  return {
    engine: "eo-aging-liquidation",
    flags: flags.slice(0, 50),
    summary: {
      flaggedLots: flags.length,
      nearExpiry: flags.filter((f) => f.reason === "near_expiry").length,
      slowMoving: flags.filter((f) => f.reason === "slow_moving").length,
      obsolete: flags.filter((f) => f.reason === "obsolete").length,
      exposureInr: exposure,
    },
  };
}

/** Cold-chain monitoring — excursions from shipment + SKU temp class. */
export function computeColdChain(opts: { shipments: Row[]; skus: Row[]; lots?: Row[] }) {
  const coldSkus = new Set(
    opts.skus
      .filter((s) => {
        const cat = (str(s.category) + str(s.subcategory)).toLowerCase();
        return (
          /reagent|vaccine|cold|bio|assay|diagnostic|blood|plasma/i.test(cat) ||
          num(s.temp_min_c) !== 0 ||
          str(s.cold_chain).toLowerCase() === "true"
        );
      })
      .map((s) => str(s.sku_id)),
  );

  // If no cold SKUs tagged, treat A-class reagents-like / short shelf life as cold
  if (coldSkus.size === 0) {
    for (const s of opts.skus) {
      if (num(s.shelf_life_days) > 0 && num(s.shelf_life_days) <= 180) {
        coldSkus.add(str(s.sku_id));
      }
    }
  }

  const checks = opts.shipments.slice(0, 40).map((s, i) => {
    const fill = num(s.fill_rate_pct);
    const status = str(s.status).toLowerCase();
    // Synthetic sensor: underfilled + long in-transit implies higher excursion risk
    const riskScore =
      (status === "in_transit" ? 0.35 : 0.1) +
      (fill < 0.5 ? 0.25 : 0) +
      ((i * 17) % 10) / 40;
    const tempTarget = "2-8°C";
    const excursion = riskScore > 0.55;
    const reading = excursion ? 12.4 + (i % 3) : 4.2 + (i % 5) * 0.3;
    return {
      shipment_id: str(s.shipment_id),
      vehicle: str(s.vehicle_number),
      status,
      temp_target: tempTarget,
      temp_reading_c: Math.round(reading * 10) / 10,
      excursion,
      gdp_compliant: !excursion,
      action: excursion ? "quarantine_and_investigate" : "release",
      severity: excursion ? (reading > 15 ? "critical" : "high") : "ok",
    };
  });

  const excursions = checks.filter((c) => c.excursion);
  return {
    engine: "cold-chain-gdp",
    coldSkuCount: coldSkus.size,
    checks,
    summary: {
      monitored: checks.length,
      excursions: excursions.length,
      gdpPassPct:
        checks.length > 0
          ? Math.round((1000 * (checks.length - excursions.length)) / checks.length) / 10
          : 100,
      critical: excursions.filter((e) => e.severity === "critical").length,
    },
  };
}

/** Multimodal track-and-trace — milestones from shipment status + ETA heuristics. */
export function computeTrackTrace(opts: { shipments: Row[] }) {
  const today = Date.now();
  const events = opts.shipments.map((s) => {
    const status = str(s.status).toLowerCase();
    const dispatch = str(s.dispatch_date);
    const dispatchedAt = dispatch ? new Date(dispatch).getTime() : today - 2 * 86400000;
    const elapsedDays = Math.max(0, (today - dispatchedAt) / 86400000);
    const mode =
      /air|flight/i.test(str(s.vehicle_type))
        ? "air"
        : /rail|rake/i.test(str(s.vehicle_type))
          ? "rail"
          : num(s.fill_rate_pct) > 0.9 && str(s.vehicle_type).includes("32")
            ? "ftl_road"
            : "road";

    const milestones = [
      { code: "BOOKED", at: new Date(dispatchedAt - 86400000).toISOString().slice(0, 10), done: true },
      {
        code: "DISPATCHED",
        at: new Date(dispatchedAt).toISOString().slice(0, 10),
        done: ["in_transit", "delivered", "out_for_delivery"].includes(status) || status === "dispatched",
      },
      {
        code: "IN_TRANSIT",
        at: new Date(dispatchedAt + 86400000).toISOString().slice(0, 10),
        done: status === "in_transit" || status === "delivered" || status === "out_for_delivery",
      },
      {
        code: "ARRIVED",
        at: new Date(dispatchedAt + 3 * 86400000).toISOString().slice(0, 10),
        done: status === "delivered",
      },
      {
        code: "POD",
        at: status === "delivered" ? new Date(dispatchedAt + 3.5 * 86400000).toISOString().slice(0, 10) : null,
        done: status === "delivered" && Boolean(str(s.eway_bill_number) || true),
      },
    ];

    const etaDays = mode === "air" ? 1 : mode === "rail" ? 4 : 3;
    const eta = new Date(dispatchedAt + etaDays * 86400000);
    const late = status !== "delivered" && elapsedDays > etaDays + 0.5;
    const source = str(s.telematics_id)
      ? "telematics"
      : str(s.carrier_ref)
        ? "carrier_api"
        : str(s.eway_bill_number)
          ? "edi_eway"
          : "synthetic_status";

    return {
      shipment_id: str(s.shipment_id),
      mode,
      status,
      origin: str(s.origin_node_id),
      dest_pincode: str(s.dest_pincode),
      eta: eta.toISOString().slice(0, 10),
      late,
      exception: late ? "ETA_BREACH" : status === "in_transit" && num(s.fill_rate_pct) < 0.5 ? "LOW_FILL" : null,
      visibility_source: source,
      milestones,
    };
  });

  return {
    engine: "multimodal-track-trace",
    shipments: events,
    summary: {
      tracked: events.length,
      inTransit: events.filter((e) => e.status === "in_transit").length,
      late: events.filter((e) => e.late).length,
      exceptions: events.filter((e) => e.exception).length,
      modes: Array.from(new Set(events.map((e) => e.mode))),
    },
  };
}

/** Plan-vs-actual across forecast, replenishment (indent), dispatch fill. */
export function computePlanVsActual(opts: {
  demand: Row[];
  shipments: Row[];
  orders?: Row[];
}) {
  // Forecast baseline = prior 4w avg; actual = last 4w
  const bySku = new Map<string, number[]>();
  for (const r of opts.demand) {
    const id = str(r.sku_id);
    const list = bySku.get(id) ?? [];
    list.push(num(r.qty));
    bySku.set(id, list);
  }

  const forecastRows = [];
  for (const [sku, vals] of Array.from(bySku.entries()).slice(0, 30)) {
    if (vals.length < 8) continue;
    const plan = vals.slice(-8, -4).reduce((a, b) => a + b, 0) / 4;
    const actual = vals.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const varPct = plan > 0 ? ((actual - plan) / plan) * 100 : 0;
    forecastRows.push({
      domain: "forecast",
      sku_id: sku,
      plan: Math.round(plan * 10) / 10,
      actual: Math.round(actual * 10) / 10,
      variance_pct: Math.round(varPct * 10) / 10,
    });
  }

  const openQty = (opts.orders ?? [])
    .filter((o) => !str(o.status) || str(o.status).toLowerCase() === "open")
    .reduce((s, o) => s + num(o.qty), 0);
  const shippedProxy = opts.shipments.length * 50; // synthetic replenishment actual
  const replenishment = {
    domain: "replenishment",
    plan: openQty || shippedProxy * 1.1,
    actual: shippedProxy,
    variance_pct:
      openQty > 0
        ? Math.round(((shippedProxy - openQty) / openQty) * 1000) / 10
        : 0,
  };

  const fills = opts.shipments.map((s) => num(s.fill_rate_pct));
  const planFill = 0.85;
  const actualFill = fills.length ? fills.reduce((a, b) => a + b, 0) / fills.length : 0;
  const dispatch = {
    domain: "dispatch",
    plan: planFill,
    actual: Math.round(actualFill * 1000) / 1000,
    variance_pct: Math.round(((actualFill - planFill) / planFill) * 1000) / 10,
  };

  const forecastBias =
    forecastRows.length > 0
      ? forecastRows.reduce((s, r) => s + r.variance_pct, 0) / forecastRows.length
      : 0;

  return {
    engine: "plan-vs-actual",
    forecast: forecastRows,
    replenishment,
    dispatch,
    summary: {
      forecastSkus: forecastRows.length,
      forecastBiasPct: Math.round(forecastBias * 10) / 10,
      replenishmentVarPct: replenishment.variance_pct,
      dispatchFillVarPct: dispatch.variance_pct,
      alerts: [
        Math.abs(forecastBias) > 12 ? "forecast_bias" : null,
        Math.abs(replenishment.variance_pct) > 20 ? "replenishment_slip" : null,
        dispatch.variance_pct < -10 ? "fill_under_plan" : null,
      ].filter(Boolean),
    },
  };
}

/** Forecast version compare (sales vs ops vs finance synthetic) + MAPE by planner. */
export function computeForecastCompare(opts: { demand: Row[]; skus?: Row[] }) {
  const bySku = new Map<string, number[]>();
  for (const r of opts.demand) {
    const id = str(r.sku_id);
    const list = bySku.get(id) ?? [];
    list.push(num(r.qty));
    bySku.set(id, list);
  }

  const planners = ["planner_north", "planner_west", "planner_south", "planner_east"];
  const versions = [];
  const mapeByPlanner: Record<string, { apeSum: number; n: number }> = {};

  let i = 0;
  for (const [sku, vals] of Array.from(bySku.entries()).slice(0, 24)) {
    if (vals.length < 8) continue;
    const actual = vals.slice(-4);
    const base = vals.slice(-8, -4);
    const consensus = base.reduce((a, b) => a + b, 0) / 4;
    const sales = consensus * 1.12;
    const finance = consensus * 0.94;
    const ops = consensus * 1.02;
    const actualAvg = actual.reduce((a, b) => a + b, 0) / 4;

    const mape = (f: number) =>
      actualAvg > 0 ? (Math.abs(actualAvg - f) / actualAvg) * 100 : 0;

    const planner = planners[i % planners.length]!;
    i += 1;
    const opsMape = mape(ops);
    mapeByPlanner[planner] = mapeByPlanner[planner] ?? { apeSum: 0, n: 0 };
    mapeByPlanner[planner]!.apeSum += opsMape;
    mapeByPlanner[planner]!.n += 1;

    versions.push({
      sku_id: sku,
      planner,
      sales_fcst: Math.round(sales * 10) / 10,
      finance_fcst: Math.round(finance * 10) / 10,
      ops_fcst: Math.round(ops * 10) / 10,
      actual: Math.round(actualAvg * 10) / 10,
      mape_sales: Math.round(mape(sales) * 10) / 10,
      mape_finance: Math.round(mape(finance) * 10) / 10,
      mape_ops: Math.round(opsMape * 10) / 10,
      spread_pct: Math.round(((sales - finance) / Math.max(consensus, 1)) * 1000) / 10,
    });
  }

  versions.sort((a, b) => b.spread_pct - a.spread_pct);
  const leaderboard = Object.entries(mapeByPlanner)
    .map(([planner, v]) => ({
      planner,
      mape: Math.round((v.apeSum / Math.max(v.n, 1)) * 10) / 10,
      skuCount: v.n,
    }))
    .sort((a, b) => a.mape - b.mape);

  return {
    engine: "forecast-version-compare",
    versions,
    leaderboard,
    summary: {
      skusCompared: versions.length,
      avgSpreadPct:
        versions.length > 0
          ? Math.round(
              (versions.reduce((s, v) => s + v.spread_pct, 0) / versions.length) * 10,
            ) / 10
          : 0,
      bestPlanner: leaderboard[0]?.planner ?? null,
      bestMape: leaderboard[0]?.mape ?? null,
    },
  };
}

/** Confidence gate — whether an action may auto-execute. */
export function confidenceGate(opts: {
  confidence: number;
  requiresApproval: boolean;
  financialInr?: number;
  role?: string;
}): { autoExecute: boolean; reason: string; threshold: number } {
  const role = opts.role ?? "planner";
  const financial = opts.financialInr ?? 0;
  // Higher financial exposure → higher confidence bar
  let threshold = 0.85;
  if (financial > 500_000) threshold = 0.95;
  else if (financial > 100_000) threshold = 0.9;

  if (role === "viewer") {
    return { autoExecute: false, reason: "viewer_readonly", threshold: 1 };
  }
  if (opts.requiresApproval) {
    return { autoExecute: false, reason: "explicit_approval_flag", threshold };
  }
  if (opts.confidence < threshold) {
    return { autoExecute: false, reason: "below_confidence_threshold", threshold };
  }
  if (role === "planner" && financial > 250_000) {
    return { autoExecute: false, reason: "planner_financial_limit", threshold };
  }
  return { autoExecute: true, reason: "passed", threshold };
}
