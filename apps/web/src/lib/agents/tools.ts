import type { IndustryPack } from "@/lib/import/config";
import { loadIndustryPack } from "@/lib/data/loadPack";
import { fetchOptimizer } from "@/lib/forecast/optimizer";
import { classifyToolException, type TowerException } from "@/lib/math/exceptions";
import { computeFefoQueue, type LotRow } from "@/lib/math/fefo";
import {
  auditFreightInvoices,
  buildInvoicesFromShipments,
  type FreightInvoice,
  type ShipmentRow,
} from "@/lib/math/freight";
import { forecastBySku, type DemandRow } from "@/lib/math/forecast";
import { localWapeDashboard, pickModel, runLocalForecast } from "@/lib/math/forecastRouter";
import {
  computeControlTower,
  computeEpod,
  computeEta,
  computeFleetSize,
  computeLoadBuild,
  computeProductionPlan,
  computeRccp,
  computeRfqScore,
  computeWarehousePlan,
} from "@/lib/math/modulesExtra";
import {
  computeAtpAllocation,
  computeColdChain,
  computeEoAging,
  computeForecastCompare,
  computeLotMortgage,
  computePlanVsActual,
  computeTrackTrace,
  confidenceGate,
} from "@/lib/math/productDepth";
import {
  computeAutoIndent,
  computeDemandSense,
  computeMeio,
  computeNetworkMip,
} from "@/lib/math/orLayer";
import {
  computeAirlineCargo,
  computeAutomotiveJit,
  computeCapacityPlan,
  computeCruiseProvisioning,
  computeDemandSupplyMatch,
  computeFoodBeverageShelf,
  computeTimeseriesForecast,
} from "@/lib/math/verticalSkills";
import { boxesFromOrders, pack3dIntoVehicles } from "@/lib/math/pack3d";
import { vrpFromShipments } from "@/lib/math/vrp";
import { runContinuousSync } from "@/lib/integrations/erpSync";
import { AGENTS } from "@/lib/product/catalog";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface ToolResult {
  tool: string;
  agentId: string;
  data: unknown;
  summary: string;
  confidence: number;
  requiresApproval: boolean;
  orgId?: string | null;
  gate?: ReturnType<typeof confidenceGate>;
}

export type ToolName =
  | "inventory_fefo"
  | "freight_audit"
  | "demand_forecast"
  | "control_tower"
  | "dispatch_analysis"
  | "risk_scan"
  | "scenario_baseline"
  | "rccp"
  | "production_plan"
  | "warehouse_plan"
  | "load_build"
  | "fleet_size"
  | "rfq_score"
  | "eta_predict"
  | "epod_validate"
  | "meio_optimize"
  | "demand_sensing"
  | "auto_indent"
  | "network_optimize"
  | "atp_allocate"
  | "lot_mortgage"
  | "eo_aging"
  | "cold_chain"
  | "track_trace"
  | "plan_vs_actual"
  | "forecast_compare"
  | "erp_continuous_sync"
  | "airline_cargo"
  | "timeseries_forecast"
  | "cruise_provisioning"
  | "automotive_jit"
  | "fnb_shelf_life"
  | "demand_supply_match"
  | "capacity_plan_agg";

export const ALL_TOOLS: ToolName[] = [
  "inventory_fefo",
  "freight_audit",
  "demand_forecast",
  "control_tower",
  "dispatch_analysis",
  "risk_scan",
  "scenario_baseline",
  "rccp",
  "production_plan",
  "warehouse_plan",
  "load_build",
  "fleet_size",
  "rfq_score",
  "eta_predict",
  "epod_validate",
  "meio_optimize",
  "demand_sensing",
  "auto_indent",
  "network_optimize",
  "atp_allocate",
  "lot_mortgage",
  "eo_aging",
  "cold_chain",
  "track_trace",
  "plan_vs_actual",
  "forecast_compare",
  "erp_continuous_sync",
  "airline_cargo",
  "timeseries_forecast",
  "cruise_provisioning",
  "automotive_jit",
  "fnb_shelf_life",
  "demand_supply_match",
  "capacity_plan_agg",
];

const TOOL_AGENT: Record<ToolName, string> = {
  inventory_fefo: "ai-inventory-strategist",
  freight_audit: "ai-settlement-auditor",
  demand_forecast: "ai-demand-analyst",
  control_tower: "ai-visibility-controller",
  dispatch_analysis: "ai-dispatch-planner",
  risk_scan: "ai-resilience-controller",
  scenario_baseline: "ai-scenario-planner",
  rccp: "ai-capacity-planner",
  production_plan: "ai-production-planner",
  warehouse_plan: "ai-warehouse-orchestrator",
  load_build: "ai-load-builder",
  fleet_size: "ai-fleet-strategist",
  rfq_score: "ai-sourcing-strategist",
  eta_predict: "ai-visibility-controller",
  epod_validate: "ai-pod-validator",
  meio_optimize: "ai-inventory-strategist",
  demand_sensing: "ai-demand-analyst",
  auto_indent: "ai-inventory-strategist",
  network_optimize: "ai-scenario-planner",
  atp_allocate: "ai-inventory-strategist",
  lot_mortgage: "ai-inventory-strategist",
  eo_aging: "ai-inventory-strategist",
  cold_chain: "ai-resilience-controller",
  track_trace: "ai-visibility-controller",
  plan_vs_actual: "ai-scenario-planner",
  erp_continuous_sync: "ai-visibility-controller",
  forecast_compare: "ai-demand-analyst",
  airline_cargo: "ai-cargo-yield",
  timeseries_forecast: "ai-demand-analyst",
  cruise_provisioning: "ai-cruise-provisioner",
  automotive_jit: "ai-automotive-jit",
  fnb_shelf_life: "ai-fnb-freshness",
  demand_supply_match: "ai-inventory-strategist",
  capacity_plan_agg: "ai-capacity-planner",
};

function pickIndustry(prompt: string): IndustryPack {
  return /cpg|fmcg|india/i.test(prompt) ? "cpg" : "medtech";
}

async function loadPendingApprovals(orgId: string | null): Promise<TowerException[]> {
  if (!orgId) return [];
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("agent_executions")
    .select("id, agent_id, tool_name, output, status, requires_approval, created_at")
    .eq("org_id", orgId)
    .eq("requires_approval", true)
    .in("status", ["needs_approval", "pending"])
    .order("created_at", { ascending: false })
    .limit(25);
  if (!data?.length) return [];
  return data.map((row) => {
    const out = row.output as { summary?: string; data?: { summary?: { exposureInr?: number }; recoverableInr?: number } } | null;
    const summary = out?.summary ?? `${row.tool_name} awaiting approval`;
    const exposure =
      out?.data?.summary?.exposureInr ??
      (typeof out?.data?.recoverableInr === "number" ? out.data.recoverableInr : undefined);
    const { taxonomy, severity } = classifyToolException(row.tool_name, summary, exposure);
    return {
      id: `AE-${String(row.id).slice(0, 8)}`,
      severity,
      taxonomy,
      module: row.tool_name,
      title: summary,
      owner: row.agent_id,
      financialInr: exposure,
      source: "agent_execution" as const,
      executionId: row.id as string,
    };
  });
}

function invoicesFromPack(
  pack: Awaited<ReturnType<typeof loadIndustryPack>>,
  shipments: ShipmentRow[],
): FreightInvoice[] {
  const rows = pack.files.freight_invoices?.rows ?? [];
  if (rows.length === 0) return buildInvoicesFromShipments(shipments);

  return rows.map((r) => {
    const billed = Number(r.billed_inr) || 0;
    const contract = Number(r.contract_inr) || 0;
    const variance = Number(r.variance_inr) || billed - contract;
    const variance_pct = contract > 0 ? Math.round((variance / contract) * 1000) / 10 : 0;
    const statusRaw = String(r.audit_status ?? "").toLowerCase();
    const audit_status: FreightInvoice["audit_status"] =
      statusRaw === "match" || statusRaw === "overbill" || statusRaw === "underbill"
        ? statusRaw
        : variance > 0
          ? "overbill"
          : variance < 0
            ? "underbill"
            : "match";
    return {
      invoice_id: String(r.invoice_id),
      shipment_id: String(r.shipment_id ?? ""),
      carrier_name: String(r.carrier_name ?? ""),
      lane_key: String(r.lane_key ?? ""),
      vehicle_type: String(r.vehicle_type ?? ""),
      billed_inr: billed,
      contract_inr: contract,
      variance_inr: variance,
      variance_pct,
      audit_status,
      flags: variance > 0 ? ["workspace_invoice"] : [],
    };
  });
}

export async function runTool(
  tool: ToolName,
  opts: { industry?: IndustryPack; prompt?: string; params?: Record<string, unknown> },
): Promise<ToolResult> {
  const industry = opts.industry ?? pickIndustry(opts.prompt ?? "");
  const pack = await loadIndustryPack(industry);
  const agentId = TOOL_AGENT[tool];
  const shipments = (pack.files.shipments?.rows ?? []) as ShipmentRow[];
  const skus = pack.files.sku_master?.rows ?? [];
  const orders = pack.files.open_orders?.rows ?? [];
  const nodes = pack.files.nodes?.rows ?? [];
  const demand = pack.files.demand_history?.rows ?? [];
  const customers = pack.files.customers?.rows ?? [];
  const allocationRules = pack.files.allocation_rules?.rows ?? [];
  const lotsRows = (pack.files.lots_inventory?.rows ?? []) as LotRow[];
  const abcClassBySku: Record<string, string> = {};
  const unitCostBySku: Record<string, number> = {};
  for (const s of skus) {
    abcClassBySku[String(s.sku_id)] = String(s.abc_class ?? "");
    unitCostBySku[String(s.sku_id)] = Number(s.unit_cost_inr) || 100;
  }

  switch (tool) {
    case "inventory_fefo": {
      const horizon = Number(opts.params?.horizonDays) || 60;
      const lots = (pack.files.lots_inventory?.rows ?? []) as LotRow[];
      const result = computeFefoQueue(lots, { horizonDays: horizon, unitCostBySku, abcClassBySku });
      return {
        tool,
        agentId,
        data: { ...result, dataSource: pack.dataSource, orgId: pack.orgId },
        summary: `${result.summary.critical} critical + ${result.summary.high} high-priority lots; ₹${result.summary.exposureInr.toLocaleString()} exposure (${industry}, ${pack.dataSource}${result.summary.abcBoosted ? `, ${result.summary.abcBoosted} A-boosted` : ""})`,
        confidence: pack.dataSource === "supabase" ? 0.94 : 0.91,
        requiresApproval: result.summary.critical > 0,
      };
    }
    case "freight_audit": {
      const invoices = invoicesFromPack(pack, shipments);
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
      const rows = demand as DemandRow[];
      const model = (opts.params?.model as string) ?? "auto";

      try {
        const res = await fetchOptimizer(
          `/api/forecast/dashboard?industry=${industry}&sku_limit=8&holdout=8`,
        );
        if (res.ok) {
          const dash = await res.json();
          const best = dash.leaderboard?.find((r: { model: string }) => r.model === "auto");
          const topSku = dash.rows?.find((r: { model: string }) => r.model === "auto");
          return {
            tool,
            agentId,
            data: { dashboard: dash, model_picker: "auto", top_sku: topSku },
            summary: `WAPE dashboard: auto-picker avg ${best?.avg_wape ?? "—"}% across ${best?.sku_count ?? 0} SKUs (${dash.engine ?? "optimizer"})`,
            confidence: best && best.avg_wape < 20 ? 0.88 : 0.76,
            requiresApproval: false,
          };
        }
      } catch {
        /* fallback */
      }

      const dash = await localWapeDashboard(industry, 8, 8);
      const bySku = new Map<string, number[]>();
      for (const r of rows) {
        const list = bySku.get(r.sku_id) ?? [];
        list.push(Number(r.qty) || 0);
        bySku.set(r.sku_id, list);
      }
      const topEntry = Array.from(bySku.entries()).sort((a, b) => {
        const ta = a[1].reduce((s, v) => s + v, 0);
        const tb = b[1].reduce((s, v) => s + v, 0);
        return tb - ta;
      })[0];
      const topSkuId = topEntry?.[0];
      const topValues = topEntry?.[1] ?? [];
      const selected = pickModel(topValues);
      const fc = topSkuId
        ? runLocalForecast(
            topValues,
            model === "auto" ? selected : (model as Parameters<typeof runLocalForecast>[1]),
            4,
          )
        : null;
      const legacy = forecastBySku(rows, 4);
      const autoLb = dash.leaderboard.find((r) => r.model === "auto");

      return {
        tool,
        agentId,
        data: {
          dashboard: dash,
          top_sku_forecast: topSkuId ? { sku_id: topSkuId, ...fc } : null,
          legacy_forecasts: legacy.forecasts.slice(0, 20),
        },
        summary: `Auto-picker WAPE ${autoLb?.avg_wape ?? legacy.mape}% · top SKU ${topSkuId ?? "—"} → ${fc?.model ?? selected} (TS fallback)`,
        confidence: (autoLb?.avg_wape ?? legacy.mape) < 20 ? 0.82 : 0.7,
        requiresApproval: false,
      };
    }
    case "control_tower": {
      const lots = (pack.files.lots_inventory?.rows ?? []) as LotRow[];
      const fefo = computeFefoQueue(lots, { horizonDays: 60, unitCostBySku, abcClassBySku });
      const freight = auditFreightInvoices(invoicesFromPack(pack, shipments));
      const eta = computeEta({ shipments });
      const underfilled = shipments.filter((s) => numFill(s) < 0.65).length;
      const pendingApprovals = await loadPendingApprovals(pack.orgId);
      const data = computeControlTower({
        stats: pack.stats,
        fefoCritical: fefo.summary.critical,
        fefoExposureInr: fefo.summary.exposureInr,
        freightRecoverable: freight.recoverableInr,
        lateEtas: eta.summary.late,
        underfilled,
        industry,
        loadedAt: pack.loadedAt,
        dataSource: pack.dataSource,
        pendingApprovals,
      });
      return {
        tool,
        agentId,
        data,
        summary: `${data.summary.openExceptions} open exceptions · ${data.summary.critical} critical · ${data.summary.pendingApprovals} approvals · ${pack.dataSource}`,
        confidence: pack.dataSource === "supabase" ? 0.93 : 0.9,
        requiresApproval: data.summary.critical > 0,
      };
    }
    case "dispatch_analysis": {
      const fills = shipments.map((s) => numFill(s));
      const avgFill = fills.length ? fills.reduce((a, b) => a + b, 0) / fills.length : 0;
      const underfilled = shipments.filter((s) => numFill(s) < 0.65);

      let vrp = vrpFromShipments(shipments as Record<string, string | number | undefined>[], {
        vehicleCapacity: 100,
        maxVehicles: 8,
      });
      let engine = vrp.engine;

      try {
        const res = await fetchOptimizer("/api/vrp/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industry,
            shipments: shipments.slice(0, 40).map((s) => ({
              id: s.shipment_id,
              demand: numFill(s) * 100 || 20,
              pincode: s.dest_pincode,
            })),
          }),
        });
        if (res.ok) {
          const remote = await res.json();
          if (remote.routes) {
            vrp = remote;
            engine = remote.engine ?? "ortools-cvrp";
          }
        }
      } catch {
        /* local Clarke–Wright */
      }

      return {
        tool,
        agentId,
        data: {
          avgFillRate: Math.round(avgFill * 1000) / 10,
          underfilled: underfilled.slice(0, 10),
          queue: underfilled.slice(0, 10).map((s) => ({
            shipment_id: s.shipment_id,
            vehicle_type: s.vehicle_type,
            fill_rate_pct: Math.round(numFill(s) * 1000) / 10,
            status: s.status,
          })),
          vrp,
          engine,
        },
        summary: `Avg fill ${Math.round(avgFill * 100)}%; ${underfilled.length} underfilled; VRP ${vrp.summary.vehiclesUsed} routes / ${vrp.summary.totalDistanceKm} km (${engine})`,
        confidence: engine.includes("ortools") ? 0.92 : 0.88,
        requiresApproval: underfilled.length > 5 || vrp.summary.unserved > 0,
      };
    }
    case "risk_scan": {
      const risks = shipments
        .filter((s) => s.status === "in_transit" && numFill(s) < 0.6)
        .map((s) => ({
          shipment_id: s.shipment_id,
          risk: "Low fill + in transit",
          severity: "high",
        }));
      return {
        tool,
        agentId,
        data: { risks, count: risks.length, queue: risks },
        summary: `${risks.length} high-severity in-transit risks in next 72h window`,
        confidence: 0.8,
        requiresApproval: risks.length > 0,
      };
    }
    case "scenario_baseline": {
      const total = demand.slice(-12).reduce((s, r) => s + Number(r.qty), 0);
      return {
        tool,
        agentId,
        data: {
          base: total,
          upside: Math.round(total * 1.15),
          downside: Math.round(total * 0.88),
          queue: [
            { scenario: "base", demand: total },
            { scenario: "upside_+15%", demand: Math.round(total * 1.15) },
            { scenario: "downside_-12%", demand: Math.round(total * 0.88) },
          ],
        },
        summary: `12-week demand base ${total}; upside +15%, downside -12%`,
        confidence: 0.78,
        requiresApproval: true,
      };
    }
    case "rccp": {
      const data = computeRccp({ demand, nodes });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.weeks },
        summary: `RCCP avg util ${data.summary.avgUtilPct}% · ${data.summary.overloadWeeks} overload weeks · ${data.summary.plantCount} plants`,
        confidence: 0.84,
        requiresApproval: data.summary.overloadWeeks > 0,
      };
    }
    case "production_plan": {
      const local = computeProductionPlan({ orders, skus });
      const products = local.plan.map((p) => ({
        sku_id: p.sku_id,
        demand: p.demand_open,
        unit_cost: unitCostBySku[p.sku_id] ?? 100,
        hours_per_unit: 0.1,
      }));
      let data: Record<string, unknown> = { ...local, queue: local.plan };
      let engine = "heuristic-production";
      try {
        const res = await fetchOptimizer("/api/production/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products, weekly_capacity: 10000 }),
        });
        if (res.ok) {
          const remote = await res.json();
          if (remote.plan) {
            data = { ...remote, queue: remote.plan };
            engine = remote.engine ?? "production-lp";
          }
        }
      } catch {
        /* local production */
      }
      const summary = (data.summary as { skusPlanned?: number; highPriority?: number; totalPlannedQty?: number; skus?: number; totalCost?: number; capacityUsedPct?: number }) ?? {};
      return {
        tool,
        agentId,
        data: { ...data, engine },
        summary: engine.includes("lp")
          ? `Production LP ${summary.skus ?? products.length} SKUs · cost ₹${Number(summary.totalCost ?? 0).toLocaleString()} · cap ${summary.capacityUsedPct ?? 0}% (${engine})`
          : `${summary.skusPlanned ?? 0} SKUs planned · ${summary.highPriority ?? 0} high priority · qty ${summary.totalPlannedQty ?? 0}`,
        confidence: engine.includes("lp") ? 0.91 : 0.85,
        requiresApproval: (summary.highPriority ?? 0) > 3 || (summary.capacityUsedPct ?? 0) > 95,
      };
    }
    case "warehouse_plan": {
      const data = computeWarehousePlan({ shipments, nodes });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.slots },
        summary: `${data.summary.hotNodes} hot docks · ${data.summary.totalLoads} loads across ${data.summary.warehouseCount} nodes`,
        confidence: 0.83,
        requiresApproval: data.summary.hotNodes > 0,
      };
    }
    case "load_build": {
      const vType = String(opts.params?.vehicleType ?? "14ft");
      const use3d = opts.params?.engine !== "2d";
      const classic = computeLoadBuild({ orders, skus, vehicleType: vType });

      let pack3d: ReturnType<typeof pack3dIntoVehicles> = pack3dIntoVehicles(
        boxesFromOrders(orders, skus),
        vType,
      );
      let engine = pack3d.engine;

      if (use3d) {
        try {
          const res = await fetchOptimizer("/api/pack/3d", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vehicle_type: vType,
              boxes: boxesFromOrders(orders, skus),
            }),
          });
          if (res.ok) {
            const remote = (await res.json()) as ReturnType<typeof pack3dIntoVehicles>;
            if (remote.loads) {
              pack3d = remote;
              engine = remote.engine ?? "ortools-3d";
            }
          }
        } catch {
          /* local extreme-point */
        }
      }

      const data = use3d
        ? {
            ...pack3d,
            classic2d: classic.summary,
            queue: pack3d.loads.map((l) => ({
              load_id: l.load_id,
              fill_pct: l.fill_pct,
              boxes: l.placements.length,
              vehicle_type: l.vehicle_type,
            })),
          }
        : { ...classic, queue: classic.loads };

      const avg = use3d ? pack3d.summary.avgFillPct : classic.summary.avgFillPct;
      const loads = use3d ? pack3d.summary.loads : classic.summary.loads;

      return {
        tool,
        agentId,
        data,
        summary: `${loads} loads · avg fill ${avg}% (${vType}, ${use3d ? engine : "ffd-2d"})`,
        confidence: use3d ? 0.9 : 0.82,
        requiresApproval: avg < 60,
      };
    }
    case "fleet_size": {
      const data = computeFleetSize({ shipments });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.mix },
        summary: `${data.summary.vehicleTypes} vehicle types · ${data.summary.consolidateCandidates} consolidate candidates`,
        confidence: 0.84,
        requiresApproval: data.summary.consolidateCandidates > 0,
      };
    }
    case "rfq_score": {
      const data = computeRfqScore({ shipments });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.lanes.map((l) => ({ shipment_id: l.shipment_id, winner: l.winner, best_score: l.best_score, origin: l.origin, dest: l.dest_pincode })) },
        summary: `${data.summary.rfqs} RFQs scored · est. savings ₹${data.summary.estimatedSavingsInr.toLocaleString()}`,
        confidence: 0.8,
        requiresApproval: true,
      };
    }
    case "eta_predict": {
      const data = computeEta({ shipments });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.etas },
        summary: `ETA: ${data.summary.onTime} on-time · ${data.summary.atRisk} at risk · ${data.summary.late} late`,
        confidence: 0.81,
        requiresApproval: data.summary.late > 0,
      };
    }
    case "epod_validate": {
      const data = computeEpod({ shipments });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.checks },
        summary: `ePOD: ${data.summary.blockers} blockers · ${data.summary.podReady} POD-ready of ${data.summary.reviewed}`,
        confidence: 0.87,
        requiresApproval: data.summary.blockers > 0,
      };
    }
    case "meio_optimize": {
      let data = computeMeio({
        skus,
        demand,
        nodes,
      });
      let engine = data.engine;
      try {
        const res = await fetchOptimizer("/api/inventory/meio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skus,
            demand_history: demand,
            nodes,
            service_level: 0.95,
          }),
        });
        if (res.ok) {
          const remote = await res.json();
          if (remote.skus) {
            data = remote;
            engine = remote.engine ?? "meio-optimizer";
          }
        }
      } catch {
        /* TS MEIO fallback */
      }
      return {
        tool,
        agentId,
        data: { ...data, queue: data.skus?.slice(0, 15), engine },
        summary: `MEIO ${data.summary.skuCount} SKUs · system SS ₹${Number(data.summary.systemSsValueInr).toLocaleString()} · pooling save ${data.summary.savingsPct}% (${engine})`,
        confidence: String(engine).includes("meio-sqrt") ? 0.92 : 0.86,
        requiresApproval: data.summary.poolingSavingsInr > 0,
      };
    }
    case "demand_sensing": {
      let data = computeDemandSense({ demand, orders });
      let engine = data.engine;
      try {
        const res = await fetchOptimizer("/api/inventory/sense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            demand_history: demand,
            open_orders: orders,
            horizon_weeks: 4,
          }),
        });
        if (res.ok) {
          const remote = await res.json();
          if (remote.skus) {
            data = remote;
            engine = remote.engine ?? "demand-sensing";
          }
        }
      } catch {
        /* local sensing */
      }
      return {
        tool,
        agentId,
        data: { ...data, queue: data.skus?.slice(0, 15), engine },
        summary: `Sense: ${data.summary.raiseSignals} raise · ${data.summary.cutSignals} cut · ${data.summary.holdSignals} hold (${engine})`,
        confidence: 0.84,
        requiresApproval: data.summary.raiseSignals + data.summary.cutSignals > 3,
      };
    }
    case "auto_indent": {
      const lots = (pack.files.lots_inventory?.rows ?? []) as Record<
        string,
        string | number | undefined
      >[];
      let data = computeAutoIndent({ skus, demand, lots });
      let engine = data.engine;
      try {
        const res = await fetchOptimizer("/api/inventory/indent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skus,
            demand_history: demand,
            on_hand: lots,
          }),
        });
        if (res.ok) {
          const remote = await res.json();
          if (remote.proposals) {
            data = remote;
            engine = remote.engine ?? "rop-auto-indent";
          }
        }
      } catch {
        /* local indent */
      }
      return {
        tool,
        agentId,
        data: { ...data, queue: data.proposals?.slice(0, 20), engine },
        summary: `Auto-indent ${data.summary.breaches} breaches · ${data.summary.critical} critical · ₹${Number(data.summary.exposureInr).toLocaleString()} (${engine})`,
        confidence: 0.88,
        requiresApproval: data.summary.breaches > 0,
      };
    }
    case "network_optimize": {
      let data = computeNetworkMip({ nodes, demand });
      let engine = data.engine;
      try {
        const res = await fetchOptimizer("/api/network/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes, demand_history: demand, max_open: 5 }),
        });
        if (res.ok) {
          const remote = await res.json();
          if (remote.open_facilities || remote.summary) {
            data = remote;
            engine = remote.engine ?? "facility-mip";
          }
        }
      } catch {
        /* greedy network */
      }
      return {
        tool,
        agentId,
        data: { ...data, queue: data.flows?.slice(0, 20), engine },
        summary: `Network: open ${data.summary.numOpen} sites · cost ₹${Number(data.summary.totalCostInr).toLocaleString()} · unmet ${data.summary.unmetDemand} (${engine})`,
        confidence: String(engine).includes("pulp") || String(engine).includes("ortools") ? 0.93 : 0.8,
        requiresApproval: true,
      };
    }
    case "atp_allocate": {
      const data = computeAtpAllocation({
        orders,
        lots: lotsRows,
        customers,
        skus,
        rules: allocationRules,
      });
      const gate = confidenceGate({
        confidence: 0.9,
        requiresApproval: data.summary.breaches > 0,
        financialInr: data.summary.breaches * 50000,
        role: String(opts.params?.role ?? "planner"),
      });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.allocations.slice(0, 20), gate },
        summary: `ATP: ${data.summary.fullyMet}/${data.summary.orders} fulfilled · ${data.summary.breaches} tier breaches`,
        confidence: 0.9,
        requiresApproval: !gate.autoExecute,
        gate,
      };
    }
    case "lot_mortgage": {
      const data = computeLotMortgage({
        lots: lotsRows,
        customers,
        orders,
        skus,
      });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.mortgages.slice(0, 15) },
        summary: `Lot mortgage: ${data.summary.continuityOk} continuous · ${data.summary.gaps} gaps · ${data.summary.lotChangeAlerts} lot-change alerts`,
        confidence: 0.88,
        requiresApproval: data.summary.gaps > 0,
      };
    }
    case "eo_aging": {
      const data = computeEoAging({
        lots: lotsRows,
        skus,
        demand,
        unitCostBySku,
      });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.flags.slice(0, 20) },
        summary: `E&O: ${data.summary.flaggedLots} lots · ₹${data.summary.exposureInr.toLocaleString()} · ${data.summary.nearExpiry} near-expiry`,
        confidence: 0.87,
        requiresApproval: data.summary.exposureInr > 100000,
      };
    }
    case "cold_chain": {
      const data = computeColdChain({ shipments, skus, lots: lotsRows });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.checks.filter((c) => c.excursion) },
        summary: `Cold-chain GDP ${data.summary.gdpPassPct}% · ${data.summary.excursions} excursions · ${data.summary.critical} critical`,
        confidence: 0.86,
        requiresApproval: data.summary.excursions > 0,
      };
    }
    case "track_trace": {
      const data = computeTrackTrace({ shipments });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.shipments.filter((s) => s.late || s.exception) },
        summary: `Track: ${data.summary.tracked} shipments · ${data.summary.late} late · ${data.summary.exceptions} exceptions`,
        confidence: 0.85,
        requiresApproval: data.summary.late > 0,
      };
    }
    case "plan_vs_actual": {
      const data = computePlanVsActual({ demand, shipments, orders });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.forecast.slice(0, 15) },
        summary: `PVA: forecast bias ${data.summary.forecastBiasPct}% · replen ${data.summary.replenishmentVarPct}% · fill ${data.summary.dispatchFillVarPct}% · alerts ${data.summary.alerts.length}`,
        confidence: 0.84,
        requiresApproval: data.summary.alerts.length > 0,
      };
    }
    case "forecast_compare": {
      const data = computeForecastCompare({ demand, skus });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.versions.slice(0, 15) },
        summary: `Forecast compare ${data.summary.skusCompared} SKUs · avg spread ${data.summary.avgSpreadPct}% · best ${data.summary.bestPlanner} @ ${data.summary.bestMape}% MAPE`,
        confidence: 0.86,
        requiresApproval: (data.summary.avgSpreadPct ?? 0) > 15,
      };
    }
    case "erp_continuous_sync": {
      const data = await runContinuousSync({
        direction: "both",
        limit: Number(opts.params?.limit ?? 20),
        orgId: pack.orgId ?? undefined,
      });
      return {
        tool,
        agentId,
        data,
        summary: `ERP sync: outbound ${data.outbound.processed} jobs (${data.outbound.delivered} delivered) · inbound ${data.inbound.pulled} rows / ${data.inbound.mappedLots} lots`,
        confidence: 0.88,
        requiresApproval: false,
      };
    }
    case "airline_cargo": {
      const data = computeAirlineCargo({ shipments, skus });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.accepted },
        summary: `Air cargo: ${data.summary.accepted}/${data.summary.bookings} accepted · $${data.summary.revenueUsd} · yield $${data.summary.avgYield}/kg · util ${data.summary.weightUtilPct}%`,
        confidence: 0.87,
        requiresApproval: data.summary.rejected > 0,
      };
    }
    case "timeseries_forecast": {
      const data = computeTimeseriesForecast({ demand, skus });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.leaderboard },
        summary: `TS backtest: ${data.summary.skus} SKUs · avg best MAPE ${data.summary.avgBestMape}% · horizon ${data.summary.horizon}`,
        confidence: 0.86,
        requiresApproval: (data.summary.avgBestMape ?? 0) > 25,
      };
    }
    case "cruise_provisioning": {
      const data = computeCruiseProvisioning({ demand, nodes, skus });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.schedule },
        summary: `Cruise provisioning: ${data.summary.portsUsed} ports · $${data.summary.totalCostUsd} · voyage ${data.summary.voyageDays}d`,
        confidence: 0.84,
        requiresApproval: true,
      };
    }
    case "automotive_jit": {
      const data = computeAutomotiveJit({ orders, skus, customers });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.call_offs },
        summary: `Automotive JIT: ${data.summary.callOffs} call-offs · ${data.summary.criticalPpm} critical PPM suppliers`,
        confidence: 0.85,
        requiresApproval: data.summary.criticalPpm > 0,
      };
    }
    case "fnb_shelf_life": {
      const data = computeFoodBeverageShelf({ lots: lotsRows, skus, demand });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.at_risk },
        summary: `F&B shelf: ${data.summary.atRisk} at-risk · ${data.summary.nearExpiry} near-expiry · ${data.summary.expired} expired`,
        confidence: 0.88,
        requiresApproval: data.summary.atRisk > 0,
      };
    }
    case "demand_supply_match": {
      const data = computeDemandSupplyMatch({ orders, lots: lotsRows, customers, skus });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.shortages },
        summary: `DSM: ${data.summary.fulfilled}/${data.summary.orders} fulfilled · shortfall ${data.summary.shortfallUnits} · ${data.summary.method}`,
        confidence: 0.9,
        requiresApproval: data.summary.shortfallUnits > 0,
      };
    }
    case "capacity_plan_agg": {
      const data = computeCapacityPlan({ demand, nodes, skus });
      return {
        tool,
        agentId,
        data: { ...data, queue: data.plan },
        summary: `Capacity: bottleneck ${data.summary.bottleneck} · peak util ${data.summary.peakUtil}% · cost ₹${Number(data.summary.totalCostInr).toLocaleString()}`,
        confidence: 0.86,
        requiresApproval: (data.summary.peakUtil ?? 0) > 100,
      };
    }
    default: {
      const _exhaustive: never = tool;
      return {
        tool: String(_exhaustive),
        agentId,
        data: {},
        summary: "Unknown tool",
        confidence: 0.5,
        requiresApproval: false,
      };
    }
  }
}

function numFill(s: ShipmentRow): number {
  return Number(s.fill_rate_pct) || 0;
}

const PROMPT_RULES: { pattern: RegExp; tool: ToolName }[] = [
  { pattern: /airline|belly cargo|air freight|uld|cargo yield|freighter/i, tool: "airline_cargo" },
  { pattern: /timeseries|time.?series|backtest|mase|seasonal naive|lightgbm forecast/i, tool: "timeseries_forecast" },
  { pattern: /cruise|provisioning|galley|par stock|port load/i, tool: "cruise_provisioning" },
  { pattern: /automotive|jit|sequenced part|ppm|oem|call.?off|takt/i, tool: "automotive_jit" },
  { pattern: /food.?beverage|f&b|shelf.?life|waste|haccp|perishable retail/i, tool: "fnb_shelf_life" },
  { pattern: /demand.?supply|match(ing)? demand|allocation optim|supply shortage match/i, tool: "demand_supply_match" },
  { pattern: /aggregate plan|capacity invest|bottleneck|oee|workforce plan/i, tool: "capacity_plan_agg" },
  { pattern: /invoice|settle|freight|leakage|shouldn.?t i pay/i, tool: "freight_audit" },
  { pattern: /fefo|expir|near.?expir|lot(?! mortgage)/i, tool: "inventory_fefo" },
  { pattern: /lot mortgage|lot continuity|reserve lots/i, tool: "lot_mortgage" },
  { pattern: /atp|allocat|shortage|customer tier|scarce supply/i, tool: "atp_allocate" },
  { pattern: /e&o|obsolete|slow.?mov|aging|liquidat/i, tool: "eo_aging" },
  { pattern: /cold.?chain|gdp|temp(erature)? excursion|2-8/i, tool: "cold_chain" },
  { pattern: /track.?trace|where.?s my (order|shipment)|multimodal|telematics|milestone/i, tool: "track_trace" },
  { pattern: /plan.?vs.?actual|pva|variance to plan/i, tool: "plan_vs_actual" },
  { pattern: /erp sync|write.?back|idoc|sap feed|continuous sync/i, tool: "erp_continuous_sync" },
  { pattern: /forecast (version|compare|consensus)|mape by planner|sales vs ops/i, tool: "forecast_compare" },
  { pattern: /meio|multi.?echelon|safety stock|newsvendor/i, tool: "meio_optimize" },
  { pattern: /auto.?indent|replenish|reorder|rop|indent propos/i, tool: "auto_indent" },
  { pattern: /demand sens|offtake|near.?term demand|sense demand/i, tool: "demand_sensing" },
  { pattern: /network|dc rational|facility location|which.?dc|close warehouse/i, tool: "network_optimize" },
  { pattern: /forecast|demand|stockout|wape/i, tool: "demand_forecast" },
  { pattern: /control tower|exception|inbox/i, tool: "control_tower" },
  { pattern: /dispatch|fill rate|vrp|route plan|vehicle routing/i, tool: "dispatch_analysis" },
  { pattern: /risk|disruption|72 hour/i, tool: "risk_scan" },
  { pattern: /scenario|what.?if|s&op/i, tool: "scenario_baseline" },
  { pattern: /rough.?cut|rccp|capacity plan/i, tool: "rccp" },
  { pattern: /production plan|mrp|work order/i, tool: "production_plan" },
  { pattern: /warehouse|dock|slotting/i, tool: "warehouse_plan" },
  { pattern: /3d|load build|bin pack|cube|pallet pack/i, tool: "load_build" },
  { pattern: /fleet|vehicle mix|truck type/i, tool: "fleet_size" },
  { pattern: /rfq|bid|carrier quote/i, tool: "rfq_score" },
  { pattern: /eta|late shipment|arrival/i, tool: "eta_predict" },
  { pattern: /epod|pod|eway|proof of delivery/i, tool: "epod_validate" },
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

export function isToolName(value: string): value is ToolName {
  return (ALL_TOOLS as string[]).includes(value);
}
