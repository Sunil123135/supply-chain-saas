/**
 * Vertical skill engines — airline cargo, TS forecasting, cruise,
 * automotive JIT, F&B shelf-life, demand-supply matching, capacity planning.
 */

export type DemandRowLike = Record<string, unknown>;
export type SkuRowLike = Record<string, unknown>;
export type OrderRowLike = Record<string, unknown>;
export type NodeRowLike = Record<string, unknown>;
export type CustomerRowLike = Record<string, unknown>;
export type LotRowLike = Record<string, unknown>;
export type ShipmentRowLike = Record<string, unknown>;

function num(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function str(v: unknown, d = ""): string {
  return v == null ? d : String(v);
}

/** Airline belly cargo: greedily accept by yield under weight+volume after bags. */
export function computeAirlineCargo(opts: {
  shipments: ShipmentRowLike[];
  skus: SkuRowLike[];
}) {
  const bagWeight = 3000;
  const bagVol = 15;
  const capWeight = 5000;
  const capVol = 35;
  const remW = Math.max(0, capWeight - bagWeight);
  const remV = Math.max(0, capVol - bagVol);

  const bookings = opts.shipments.slice(0, 24).map((s, i) => {
    const weight = Math.max(20, num(s.weight_kg, 80 + i * 12));
    const volume = Math.max(0.05, weight / 250);
    const commodity = /pharma|cold|med/i.test(str(s.sku_id) + str(s.notes))
      ? "pharma"
      : /express|urgent/i.test(str(s.priority) + str(s.notes))
        ? "express"
        : "general";
    const rate =
      commodity === "pharma" ? 6.5 : commodity === "express" ? 8 : 2.5 + (i % 5) * 0.3;
    return {
      id: str(s.shipment_id, `CG${i + 1}`),
      commodity,
      weight_kg: Math.round(weight * 10) / 10,
      volume_m3: Math.round(volume * 100) / 100,
      rate_per_kg: Math.round(rate * 100) / 100,
      all_or_nothing: commodity !== "general",
      pieces: 1,
    };
  });

  const ranked = [...bookings].sort(
    (a, b) => b.rate_per_kg * b.weight_kg - a.rate_per_kg * a.weight_kg,
  );

  let wLeft = remW;
  let vLeft = remV;
  const accepted: typeof bookings = [];
  let revenue = 0;

  for (const b of ranked) {
    if (b.weight_kg <= wLeft && b.volume_m3 <= vLeft) {
      accepted.push(b);
      wLeft -= b.weight_kg;
      vLeft -= b.volume_m3;
      revenue += b.rate_per_kg * b.weight_kg;
    }
  }

  const cargoW = accepted.reduce((a, b) => a + b.weight_kg, 0);
  return {
    engine: "airline-cargo-yield",
    flight: { aircraft: "B777-belly", bag_weight_kg: bagWeight, cargo_cap_kg: remW },
    summary: {
      bookings: bookings.length,
      accepted: accepted.length,
      rejected: bookings.length - accepted.length,
      revenueUsd: Math.round(revenue),
      cargoWeightKg: Math.round(cargoW),
      weightUtilPct: Math.round(((bagWeight + cargoW) / capWeight) * 1000) / 10,
      avgYield: cargoW > 0 ? Math.round((revenue / cargoW) * 100) / 100 : 0,
    },
    accepted,
    rejected: bookings.filter((b) => !accepted.find((a) => a.id === b.id)),
    uldHint: {
      recommended: cargoW > 2500 ? ["PMC", "AKE"] : ["AKE"],
      note: "Assign dense pharma to active cool ULDs first",
    },
  };
}

/** Time-series: seasonal-naive + MA, horizon MAPE/MASE backtest. */
export function computeTimeseriesForecast(opts: {
  demand: DemandRowLike[];
  skus: SkuRowLike[];
}) {
  const bySku = new Map<string, number[]>();
  for (const r of opts.demand) {
    const sku = str(r.sku_id);
    if (!sku) continue;
    const qty = num(r.qty ?? r.quantity ?? r.demand_qty);
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku)!.push(qty);
  }

  const horizon = 4;
  const rows: {
    sku_id: string;
    n: number;
    mape_naive: number;
    mape_ma: number;
    mase: number;
    forecast: number[];
    best: string;
  }[] = [];

  Array.from(bySku.entries()).forEach(([sku, series]) => {
    if (series.length < horizon + 4) return;
    const train = series.slice(0, -horizon);
    const actual = series.slice(-horizon);
    const season = Math.min(7, Math.max(1, Math.floor(train.length / 3)));

    const naivePred = actual.map((_v: number, i: number) => {
      const idx = train.length - season + (i % season);
      return train[Math.max(0, idx)] ?? train[train.length - 1];
    });
    const maWindow = Math.min(4, train.length);
    const ma = train.slice(-maWindow).reduce((a: number, b: number) => a + b, 0) / maWindow;
    const maPred = actual.map(() => ma);

    const mape = (pred: number[]) => {
      let s = 0;
      let c = 0;
      for (let i = 0; i < pred.length; i++) {
        if (actual[i] === 0) continue;
        s += Math.abs(pred[i] - actual[i]) / Math.abs(actual[i]);
        c++;
      }
      return c ? Math.round((s / c) * 1000) / 10 : 0;
    };

    let scale = 0;
    for (let i = 1; i < train.length; i++) scale += Math.abs(train[i] - train[i - 1]);
    scale = scale / Math.max(1, train.length - 1) || 1;
    const maeNaive =
      naivePred.reduce((a: number, p: number, i: number) => a + Math.abs(p - actual[i]), 0) /
      horizon;
    const mase = Math.round((maeNaive / scale) * 100) / 100;

    const mapeN = mape(naivePred);
    const mapeM = mape(maPred);
    const best = mapeM <= mapeN ? "moving_avg" : "seasonal_naive";
    const last = series[series.length - 1] ?? 0;
    const forecast =
      best === "moving_avg"
        ? Array.from({ length: horizon }, () => Math.round(ma * 10) / 10)
        : Array.from({ length: horizon }, (_: unknown, i: number) => {
            const idx = series.length - season + (i % season);
            return Math.round((series[Math.max(0, idx)] ?? last) * 10) / 10;
          });

    rows.push({
      sku_id: sku,
      n: series.length,
      mape_naive: mapeN,
      mape_ma: mapeM,
      mase,
      forecast,
      best,
    });
  });

  rows.sort((a, b) => Math.min(a.mape_ma, a.mape_naive) - Math.min(b.mape_ma, b.mape_naive));
  const avgMape =
    rows.length === 0
      ? 0
      : Math.round(
          (rows.reduce((a, r) => a + Math.min(r.mape_ma, r.mape_naive), 0) / rows.length) * 10,
        ) / 10;

  return {
    engine: "ts-backtest-mase",
    summary: {
      skus: rows.length,
      avgBestMape: avgMape,
      horizon,
      note: "Temporal holdout only — no random splits",
    },
    leaderboard: rows.slice(0, 20),
  };
}

/** Cruise multi-port provisioning under storage caps. */
export function computeCruiseProvisioning(opts: {
  demand: DemandRowLike[];
  nodes: NodeRowLike[];
  skus: SkuRowLike[];
}) {
  const ports = (opts.nodes.length ? opts.nodes : [{ node_id: "Miami" }, { node_id: "Cozumel" }])
    .slice(0, 4)
    .map((n, i) => ({
      name: str(n.node_id ?? n.name, `Port${i + 1}`),
      costFactor: 1 + i * 0.08,
      daysUntilNext: i === 3 ? 0 : 2 + (i % 2),
    }));

  const items = opts.skus.slice(0, 12).map((s, i) => {
    const daily = 80 + i * 25;
    const storage: "dry" | "cold" | "frozen" =
      i % 3 === 0 ? "frozen" : i % 3 === 1 ? "cold" : "dry";
    return {
      item: str(s.sku_id, `ITEM${i}`),
      daily,
      storage,
      volume_per_unit: storage === "dry" ? 0.001 : 0.0012,
    };
  });

  const voyageDays = ports.reduce((a, p) => a + p.daysUntilNext, 0) || 7;
  const caps = { dry: 500, cold: 300, frozen: 200 };
  const used = { dry: 0, cold: 0, frozen: 0 };
  const schedule: {
    port: string;
    orders: { item: string; qty: number; unit_cost: number; total: number }[];
    port_cost: number;
  }[] = [];

  let totalCost = 0;
  for (const port of ports) {
    if (!port.daysUntilNext && port !== ports[ports.length - 1]) continue;
    const orders: { item: string; qty: number; unit_cost: number; total: number }[] = [];
    let portCost = 0;
    for (const item of items) {
      const need = item.daily * Math.max(2, Math.ceil(voyageDays / ports.length));
      const room = caps[item.storage] - used[item.storage];
      const qty = Math.min(need, Math.max(0, Math.floor(room / item.volume_per_unit)));
      if (qty <= 0) continue;
      const unit = (12 + (item.storage === "frozen" ? 4 : 0)) * port.costFactor;
      const total = qty * unit;
      orders.push({
        item: item.item,
        qty,
        unit_cost: Math.round(unit * 100) / 100,
        total: Math.round(total),
      });
      used[item.storage] += qty * item.volume_per_unit;
      portCost += total;
    }
    if (orders.length) {
      schedule.push({ port: port.name, orders, port_cost: Math.round(portCost) });
      totalCost += portCost;
    }
  }

  return {
    engine: "cruise-provisioning",
    summary: {
      voyageDays,
      portsUsed: schedule.length,
      totalCostUsd: Math.round(totalCost),
      storageUtil: {
        dry: Math.round((used.dry / caps.dry) * 1000) / 10,
        cold: Math.round((used.cold / caps.cold) * 1000) / 10,
        frozen: Math.round((used.frozen / caps.frozen) * 1000) / 10,
      },
    },
    schedule,
    parHint: items.slice(0, 5).map((i) => ({
      item: i.item,
      par_level: Math.round(i.daily * 7 * 1.2),
      storage: i.storage,
    })),
  };
}

/** Automotive JIT call-offs + PPM scorecard. */
export function computeAutomotiveJit(opts: {
  orders: OrderRowLike[];
  skus: SkuRowLike[];
  customers: CustomerRowLike[];
}) {
  const taktMin = 1;
  const bufferHours = 2;
  const callOffs = opts.orders.slice(0, 40).map((o, i) => {
    const lead = 2 + (i % 4);
    const qty = Math.max(1, num(o.qty ?? o.quantity, 4));
    const build = new Date(Date.now() + (i + 1) * taktMin * 60_000);
    const delivery = new Date(build.getTime() - (lead + bufferHours) * 3600_000);
    return {
      sequence: i + 1,
      vin: str(o.order_id, `VIN${1000 + i}`),
      part_number: str(o.sku_id, `PART_${i}`),
      supplier: str(opts.customers[i % Math.max(1, opts.customers.length)]?.customer_id, `SUP_${(i % 5) + 1}`),
      quantity: qty,
      delivery_time: delivery.toISOString(),
      required_time: build.toISOString(),
      dock_door: (i % 12) + 1,
    };
  });

  const suppliers = new Map<string, { received: number; defective: number }>();
  for (const c of callOffs) {
    const cur = suppliers.get(c.supplier) ?? { received: 0, defective: 0 };
    cur.received += c.quantity * 100;
    cur.defective += c.quantity % 7 === 0 ? 2 : 0;
    suppliers.set(c.supplier, cur);
  }

  const ppm = Array.from(suppliers.entries())
    .map(([supplier, v]) => ({
      supplier,
      received: v.received,
      defective: v.defective,
      ppm: v.received ? Math.round((v.defective / v.received) * 1_000_000) : 0,
      meets_target: v.received
        ? (v.defective / v.received) * 1_000_000 <= 50
        : true,
    }))
    .sort((a, b) => b.ppm - a.ppm);

  return {
    engine: "automotive-jit-ppm",
    summary: {
      callOffs: callOffs.length,
      suppliers: ppm.length,
      criticalPpm: ppm.filter((p) => p.ppm > 150).length,
      otdTarget: 99,
      inventoryTurnsTarget: 15,
    },
    call_offs: callOffs.slice(0, 25),
    ppm_scorecard: ppm,
  };
}

/** F&B shelf-life FEFO + waste risk. */
export function computeFoodBeverageShelf(opts: {
  lots: LotRowLike[];
  skus: SkuRowLike[];
  demand: DemandRowLike[];
}) {
  const today = Date.now();
  const velocity = new Map<string, number>();
  for (const d of opts.demand) {
    const sku = str(d.sku_id);
    velocity.set(sku, (velocity.get(sku) ?? 0) + num(d.qty ?? d.quantity));
  }

  const lots = opts.lots.slice(0, 80).map((l) => {
    const sku = str(l.sku_id);
    const expiry = Date.parse(str(l.expiry_date)) || today + 14 * 86400000;
    const remaining = Math.round((expiry - today) / 86400000);
    const qty = num(l.qty_on_hand ?? l.quantity, 0);
    const daily = Math.max(1, (velocity.get(sku) ?? 10) / 30);
    const daysSupply = qty / daily;
    const shelfLife = Math.max(remaining + 5, 14);
    const rslPct = Math.round((remaining / shelfLife) * 1000) / 10;
    let action = "monitor_daily";
    let risk: "low" | "medium" | "high" = "low";
    if (remaining < 0) {
      action = "quarantine_dispose";
      risk = "high";
    } else if (daysSupply > remaining * 1.5 && remaining < 30) {
      action = "markdown_promotion_immediate";
      risk = "high";
    } else if (daysSupply > remaining && remaining < 30) {
      action = "redistribute_high_velocity";
      risk = "medium";
    }
    return {
      lot: str(l.lot_id ?? l.lot_number, "LOT"),
      sku_id: sku,
      qty,
      remaining_days: remaining,
      rsl_pct: rslPct,
      days_of_supply: Math.round(daysSupply * 10) / 10,
      freshness:
        remaining < 0 ? "expired" : rslPct >= 67 ? "fresh" : rslPct >= 33 ? "medium" : "near_expiry",
      risk,
      action,
      channel_min_rsl: { retail: 67, foodservice: 50, export: 80 },
    };
  });

  lots.sort((a, b) => a.remaining_days - b.remaining_days);
  const atRisk = lots.filter((l) => l.risk !== "low");
  return {
    engine: "fnb-fefo-waste",
    summary: {
      lots: lots.length,
      atRisk: atRisk.length,
      expired: lots.filter((l) => l.freshness === "expired").length,
      nearExpiry: lots.filter((l) => l.freshness === "near_expiry").length,
      fefoComplianceTarget: 98,
    },
    fefo_pick_queue: lots.filter((l) => l.remaining_days >= 0).slice(0, 25),
    at_risk: atRisk.slice(0, 20),
  };
}

/** Priority demand-supply matching with ATP horizon. */
export function computeDemandSupplyMatch(opts: {
  orders: OrderRowLike[];
  lots: LotRowLike[];
  customers: CustomerRowLike[];
  skus: SkuRowLike[];
}) {
  const supply = new Map<string, number>();
  for (const l of opts.lots) {
    const sku = str(l.sku_id);
    supply.set(sku, (supply.get(sku) ?? 0) + num(l.qty_on_hand ?? l.quantity));
  }

  const tierOf = (cust: string) => {
    const c = opts.customers.find((x) => str(x.customer_id) === cust);
    const t = str(c?.tier ?? c?.priority, "5");
    const n = Number(t);
    if (Number.isFinite(n)) return n;
    if (/strategic|a\b/i.test(t)) return 1;
    if (/b\b/i.test(t)) return 3;
    return 5;
  };

  const demands = opts.orders.slice(0, 50).map((o, i) => ({
    order_id: str(o.order_id, `ORD${i}`),
    customer: str(o.customer_id, "CUST"),
    sku_id: str(o.sku_id),
    qty: Math.max(1, num(o.qty ?? o.quantity, 10)),
    priority: tierOf(str(o.customer_id)),
    required_day: i % 14,
  }));

  demands.sort((a, b) => a.priority - b.priority || a.required_day - b.required_day);

  const allocations = [];
  let fulfilled = 0;
  let partial = 0;
  let shortfallUnits = 0;

  for (const d of demands) {
    const avail = supply.get(d.sku_id) ?? 0;
    const alloc = Math.min(d.qty, avail);
    supply.set(d.sku_id, avail - alloc);
    const status = alloc >= d.qty ? "fulfilled" : alloc > 0 ? "partial" : "unfulfilled";
    if (status === "fulfilled") fulfilled++;
    else if (status === "partial") partial++;
    shortfallUnits += d.qty - alloc;
    allocations.push({
      ...d,
      allocated: alloc,
      shortfall: d.qty - alloc,
      status,
      fulfillment_pct: Math.round((alloc / d.qty) * 1000) / 10,
    });
  }

  const atpHorizon = Array.from(supply.entries()).slice(0, 12).map(([sku, qty]) => ({
    sku_id: sku,
    atp_today: Math.max(0, Math.round(qty)),
    atp_week1: Math.max(0, Math.round(qty * 1.1)),
    atp_week2: Math.max(0, Math.round(qty * 1.25)),
  }));

  return {
    engine: "dsm-priority-atp",
    summary: {
      orders: demands.length,
      fulfilled,
      partial,
      unfulfilled: demands.length - fulfilled - partial,
      shortfallUnits,
      method: "priority",
    },
    allocations: allocations.slice(0, 30),
    shortages: allocations.filter((a) => a.shortfall > 0).slice(0, 15),
    atp_horizon: atpHorizon,
  };
}

/** Aggregate capacity plan: bottleneck + hire/OT/subcontract heuristic. */
export function computeCapacityPlan(opts: {
  demand: DemandRowLike[];
  nodes: NodeRowLike[];
  skus: SkuRowLike[];
}) {
  const periods = 8;
  const demandByPeriod = Array.from({ length: periods }, () => 0);
  opts.demand.forEach((d, i) => {
    demandByPeriod[i % periods] += num(d.qty ?? d.quantity, 0);
  });
  const scale =
    Math.max(...demandByPeriod, 1) > 0
      ? 1200 / Math.max(...demandByPeriod, 1)
      : 1;
  const demand = demandByPeriod.map((d, i) => Math.round(d * scale) || 800 + ((i * 37) % 200));

  const steps = [
    { name: "Cutting", capacity_per_hour: 100 },
    { name: "Assembly", capacity_per_hour: 80 },
    { name: "Testing", capacity_per_hour: 120 },
    { name: "Packaging", capacity_per_hour: 90 },
  ].map((s) => ({
    ...s,
    hours_available: 160,
    total_capacity: s.capacity_per_hour * 160,
  }));
  const bottleneck = steps.reduce((a, b) => (b.total_capacity < a.total_capacity ? b : a));

  let workforce = 40;
  const unitsPerWorker = 30;
  let inventory = 500;
  const plan = demand.map((dem, t) => {
    const capacity = workforce * unitsPerWorker;
    let production = Math.min(dem + Math.max(0, 200 - inventory), capacity);
    let overtime = 0;
    let subcontract = 0;
    let hire = 0;
    let fire = 0;
    if (production < dem && inventory < dem * 0.2) {
      overtime = Math.min(workforce * 10, dem - production);
      production += overtime;
    }
    if (production + inventory < dem) {
      subcontract = Math.min(500, dem - production - inventory);
    }
    if (dem > capacity * 1.15) {
      hire = 2;
      workforce += hire;
    } else if (dem < capacity * 0.55 && workforce > 30) {
      fire = 1;
      workforce -= fire;
    }
    inventory = Math.max(0, inventory + production + subcontract - dem);
    const util = Math.round((production / Math.max(1, workforce * unitsPerWorker)) * 1000) / 10;
    return {
      period: t + 1,
      demand: dem,
      production,
      overtime,
      subcontract,
      inventory,
      workforce,
      hire,
      fire,
      utilization_pct: util,
    };
  });

  const totalCost = plan.reduce(
    (a, p) =>
      a +
      p.production * 50 +
      p.workforce * 2000 +
      p.overtime * 75 +
      p.inventory * 5 +
      p.hire * 1000 +
      p.fire * 1500 +
      p.subcontract * 80,
    0,
  );

  return {
    engine: "capacity-aggregate-toc",
    summary: {
      periods,
      bottleneck: bottleneck.name,
      systemThroughput: bottleneck.total_capacity,
      totalCostInr: Math.round(totalCost),
      peakUtil: Math.max(...plan.map((p) => p.utilization_pct)),
      oeeDemo: { availability: 90, performance: 85, quality: 95, oee: 72.7 },
    },
    bottleneck_steps: steps.map((s) => ({
      ...s,
      utilization_vs_drum: Math.round((bottleneck.total_capacity / s.total_capacity) * 1000) / 10,
    })),
    plan,
  };
}
