/** MEIO + newsvendor + auto-indent — TS fallback when optimizer offline. */

export type Row = Record<string, string | number | undefined>;

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const Z: Record<number, number> = {
  0.9: 1.282,
  0.95: 1.645,
  0.97: 1.881,
  0.98: 2.054,
  0.99: 2.326,
};

function zFor(sl: number): number {
  const keys = Object.keys(Z).map(Number);
  const closest = keys.reduce((a, b) => (Math.abs(b - sl) < Math.abs(a - sl) ? b : a));
  return Z[closest] ?? 1.645;
}

function stats(qty: number[]): { mean: number; std: number } {
  if (!qty.length) return { mean: 0, std: 0 };
  const mean = qty.reduce((a, b) => a + b, 0) / qty.length;
  if (qty.length < 2) return { mean, std: mean * 0.2 };
  const var_ = qty.reduce((s, x) => s + (x - mean) ** 2, 0) / (qty.length - 1);
  return { mean, std: Math.sqrt(var_) };
}

export function computeMeio(opts: {
  skus: Row[];
  demand: Row[];
  nodes?: Row[];
  serviceLevel?: number;
  holdingRate?: number;
}) {
  const slDefault = opts.serviceLevel ?? 0.95;
  const holdingRate = opts.holdingRate ?? 0.25;
  const bySku = new Map<string, number[]>();
  for (const r of opts.demand) {
    const id = String(r.sku_id ?? "");
    if (!id) continue;
    const list = bySku.get(id) ?? [];
    list.push(num(r.qty));
    bySku.set(id, list);
  }

  const types = new Set(
    (opts.nodes ?? []).map((n) => String(n.node_type ?? "").toLowerCase()),
  );
  let echelons = 0;
  for (const t of ["plant", "dc", "wh", "cfa", "distributor"]) {
    if (Array.from(types).some((x) => x.includes(t))) echelons += 1;
  }
  echelons = Math.max(1, echelons);
  const poolFactor = echelons > 1 ? Math.sqrt(echelons) / echelons : 1;

  const skuMeta = new Map(opts.skus.map((s) => [String(s.sku_id), s]));
  const results = [];
  let totalSs = 0;
  let totalInd = 0;

  for (const [skuId, hist] of Array.from(bySku.entries()).slice(0, 80)) {
    const { mean, std } = stats(hist.slice(-26));
    const meta = skuMeta.get(skuId) ?? {};
    const leadWeeks = (num(meta.lead_time_days) || 14) / 7;
    const unitCost = num(meta.unit_cost) || num(meta.cost) || 100;
    const abc = String(meta.abc_class ?? "B").toUpperCase();
    const sl = abc === "A" ? 0.98 : abc === "B" ? 0.95 : Math.min(slDefault, 0.9);
    const z = zFor(sl);
    const sigma = Math.max(std, mean * 0.15);
    const ssLeaf = z * sigma * Math.sqrt(Math.max(leadWeeks, 0.1));
    const ssSystem = ssLeaf * poolFactor * echelons;
    const ssIndependent = ssLeaf * echelons;
    const rop = mean * leadWeeks + ssLeaf;
    const annualD = mean * 52;
    const h = Math.max(holdingRate * unitCost, 1);
    const moq = Math.max(1, num(meta.moq) || 1);
    let roq = Math.sqrt(Math.max((2 * annualD * 500) / h, 1));
    roq = Math.max(moq, Math.ceil(roq / moq) * moq);
    const ssValue = ssSystem * unitCost;
    totalSs += ssValue;
    totalInd += ssIndependent * unitCost;

    const cu = 0.4 * unitCost;
    const co = 0.6 * unitCost;
    const critical = cu / (cu + co);
    const nvZ = zFor(Math.min(0.99, Math.max(0.5, critical)));
    const nvQ = mean * 4 + nvZ * Math.max(std * 2, mean * 0.4);

    results.push({
      sku_id: skuId,
      abc_class: abc,
      demand_mean_weekly: Math.round(mean * 100) / 100,
      demand_std_weekly: Math.round(std * 100) / 100,
      lead_time_weeks: Math.round(leadWeeks * 100) / 100,
      service_level: sl,
      safety_stock_leaf: Math.round(ssLeaf * 10) / 10,
      safety_stock_system: Math.round(ssSystem * 10) / 10,
      safety_stock_independent: Math.round(ssIndependent * 10) / 10,
      rop: Math.round(rop * 10) / 10,
      roq: Math.round(roq * 10) / 10,
      unit_cost: unitCost,
      ss_inventory_value_inr: Math.round(ssValue),
      newsvendor: {
        critical_fractile: Math.round(critical * 10000) / 10000,
        z: Math.round(nvZ * 1000) / 1000,
        q_star: Math.round(nvQ * 10) / 10,
      },
    });
  }

  results.sort((a, b) => b.ss_inventory_value_inr - a.ss_inventory_value_inr);
  const savings = Math.max(0, totalInd - totalSs);

  return {
    engine: "meio-ts-fallback",
    echelons,
    pool_factor: Math.round(poolFactor * 10000) / 10000,
    skus: results,
    summary: {
      skuCount: results.length,
      systemSsValueInr: Math.round(totalSs),
      independentSsValueInr: Math.round(totalInd),
      poolingSavingsInr: Math.round(savings),
      savingsPct: totalInd ? Math.round((1000 * savings) / totalInd) / 10 : 0,
    },
  };
}

export function computeDemandSense(opts: {
  demand: Row[];
  orders?: Row[];
  horizonWeeks?: number;
}) {
  const horizon = opts.horizonWeeks ?? 4;
  const bySku = new Map<string, { week: string; qty: number }[]>();
  for (const r of opts.demand) {
    const id = String(r.sku_id ?? "");
    if (!id) continue;
    const list = bySku.get(id) ?? [];
    list.push({ week: String(r.week_start ?? ""), qty: num(r.qty) });
    bySku.set(id, list);
  }
  const openBy = new Map<string, number>();
  for (const o of opts.orders ?? []) {
    const st = String(o.status ?? "").toLowerCase();
    if (st && st !== "open" && st !== "confirmed") continue;
    const id = String(o.sku_id ?? "");
    openBy.set(id, (openBy.get(id) ?? 0) + num(o.qty));
  }

  const sensed = [];
  for (const [skuId, series] of Array.from(bySku.entries()).slice(0, 60)) {
    const vals = series
      .slice()
      .sort((a: { week: string; qty: number }, b: { week: string; qty: number }) =>
        a.week.localeCompare(b.week),
      )
      .map((x: { week: string; qty: number }) => x.qty);
    if (vals.length < 4) continue;
    const recent = vals.slice(-4).reduce((a: number, b: number) => a + b, 0) / 4;
    const priorSlice = vals.slice(-8, -4);
    const prior = priorSlice.length
      ? priorSlice.reduce((a: number, b: number) => a + b, 0) / priorSlice.length
      : recent;
    const openRate = (openBy.get(skuId) ?? 0) / horizon;
    const signal = 0.5 * recent + 0.3 * prior + 0.2 * openRate;
    const deltaPct = recent > 0 ? ((signal - recent) / recent) * 100 : 0;
    const weeks = Array.from({ length: horizon }, (_, i) => {
      const w = horizon > 1 ? i / (horizon - 1) : 0;
      const qty = signal * (1 - 0.35 * w) + recent * (0.35 * w);
      return { week_offset: i + 1, sensed_qty: Math.round(qty * 10) / 10 };
    });
    sensed.push({
      sku_id: skuId,
      recent_4w_avg: Math.round(recent * 10) / 10,
      prior_4w_avg: Math.round(prior * 10) / 10,
      open_order_rate: Math.round(openRate * 10) / 10,
      sense_signal: Math.round(signal * 10) / 10,
      delta_vs_base_pct: Math.round(deltaPct * 10) / 10,
      horizon: weeks,
      action: deltaPct > 8 ? "raise" : deltaPct < -8 ? "cut" : "hold",
    });
  }
  sensed.sort((a, b) => Math.abs(b.delta_vs_base_pct) - Math.abs(a.delta_vs_base_pct));
  const raises = sensed.filter((s) => s.action === "raise").length;
  const cuts = sensed.filter((s) => s.action === "cut").length;
  return {
    engine: "demand-sensing-ts",
    horizon_weeks: horizon,
    skus: sensed,
    summary: {
      skuCount: sensed.length,
      raiseSignals: raises,
      cutSignals: cuts,
      holdSignals: sensed.length - raises - cuts,
    },
  };
}

export function computeAutoIndent(opts: {
  skus: Row[];
  demand: Row[];
  lots?: Row[];
  serviceLevel?: number;
}) {
  const meio = computeMeio({
    skus: opts.skus,
    demand: opts.demand,
    serviceLevel: opts.serviceLevel,
  });
  const stock = new Map<string, number>();
  for (const row of opts.lots ?? []) {
    const id = String(row.sku_id ?? "");
    stock.set(
      id,
      (stock.get(id) ?? 0) + (num(row.qty_on_hand) || num(row.qty) || num(row.available_qty)),
    );
  }
  const proposals = [];
  for (const s of meio.skus) {
    const oh = stock.get(s.sku_id) ?? s.demand_mean_weekly * 2;
    const gap = s.rop - oh;
    if (gap <= 0) continue;
    const target = s.demand_mean_weekly * 4 + s.safety_stock_leaf;
    const moq = Math.max(1, s.roq > 0 ? Math.min(s.roq, 1000) : 1);
    // use roq from meio but ensure MOQ rounding via sku
    let indent = Math.max(s.roq, target - oh);
    const metaMoq = Math.max(
      1,
      num(opts.skus.find((x) => String(x.sku_id) === s.sku_id)?.moq) || 1,
    );
    indent = Math.max(metaMoq, Math.round(indent / metaMoq) * metaMoq);
    proposals.push({
      sku_id: s.sku_id,
      abc_class: s.abc_class,
      on_hand: Math.round(oh * 10) / 10,
      rop: s.rop,
      gap: Math.round(gap * 10) / 10,
      indent_qty: indent,
      moq: metaMoq,
      lead_time_days: s.lead_time_weeks * 7,
      doc_type: s.abc_class === "A" ? "STO" : "PO",
      priority: gap > s.rop * 0.5 ? "critical" : "normal",
      exposure_inr: Math.round(gap * s.unit_cost),
    });
  }
  proposals.sort((a, b) => b.exposure_inr - a.exposure_inr);
  return {
    engine: "rop-auto-indent-ts",
    proposals,
    summary: {
      breaches: proposals.length,
      critical: proposals.filter((p) => p.priority === "critical").length,
      totalIndentQty: proposals.reduce((s, p) => s + p.indent_qty, 0),
      exposureInr: proposals.reduce((s, p) => s + p.exposure_inr, 0),
    },
  };
}

export function computeNetworkMip(opts: { nodes: Row[]; demand: Row[]; maxOpen?: number }) {
  const facilities = opts.nodes
    .filter((n) => /dc|wh|cfa|plant|hub/i.test(String(n.node_type) + String(n.node_id)))
    .slice(0, 12)
    .map((n) => ({
      id: String(n.node_id),
      pincode: String(n.pincode ?? ""),
      fixed_cost: num(n.fixed_cost) || 250000,
      capacity: num(n.capacity) || 4000,
    }));

  const totalDemand =
    opts.demand.slice(-200).reduce((s, r) => s + num(r.qty), 0) || 1000;
  const customers =
    facilities.length > 0
      ? facilities.slice(0, 8).map((f, i) => ({
          id: `CUST-${i + 1}`,
          pincode: f.pincode || "110001",
          demand: (totalDemand / facilities.length) * (0.8 + 0.1 * (i % 3)),
        }))
      : [{ id: "CUST-1", pincode: "110001", demand: totalDemand }];

  const facs =
    facilities.length > 0
      ? facilities
      : [
          { id: "DC-NCR", pincode: "110001", fixed_cost: 500000, capacity: 5000 },
          { id: "DC-MUM", pincode: "400001", fixed_cost: 450000, capacity: 4500 },
          { id: "DC-BLR", pincode: "560001", fixed_cost: 400000, capacity: 4000 },
        ];

  const maxOpen = opts.maxOpen ?? facs.length;
  const ranked = [...facs].sort((a, b) => a.fixed_cost / a.capacity - b.fixed_cost / b.capacity);
  const open = ranked.slice(0, maxOpen);
  let fixed = 0;
  let transport = 0;
  const flows: { from: string; to: string; qty: number; cost: number }[] = [];
  const demandLeft = new Map(customers.map((c) => [c.id, c.demand]));

  function pinKm(a: string, b: string): number {
    const pa = a.replace(/\D/g, "").slice(0, 3);
    const pb = b.replace(/\D/g, "").slice(0, 3);
    if (!pa || !pb) return 250;
    return Math.max(40, Math.abs(Number(pa) - Number(pb)) * 22 + 30);
  }

  for (const f of open) {
    fixed += f.fixed_cost;
    let used = 0;
    const rankedCust = [...customers].sort(
      (a, b) => pinKm(f.pincode, a.pincode) - pinKm(f.pincode, b.pincode),
    );
    for (const c of rankedCust) {
      const need = demandLeft.get(c.id) ?? 0;
      if (need <= 0 || used >= f.capacity) continue;
      const ship = Math.min(need, f.capacity - used);
      const unit = pinKm(f.pincode, c.pincode) * 0.35;
      transport += ship * unit;
      used += ship;
      demandLeft.set(c.id, need - ship);
      flows.push({ from: f.id, to: c.id, qty: Math.round(ship * 10) / 10, cost: Math.round(ship * unit) });
    }
  }

  const unmet = Array.from(demandLeft.values()).reduce((a, b) => a + b, 0);
  return {
    engine: "greedy-facility-ts",
    status: "Heuristic",
    open_facilities: open.map((f) => f.id),
    flows: flows.slice(0, 80),
    summary: {
      numOpen: open.length,
      fixedCostInr: Math.round(fixed),
      transportCostInr: Math.round(transport),
      totalCostInr: Math.round(fixed + transport),
      unmetDemand: Math.round(unmet * 10) / 10,
    },
  };
}
