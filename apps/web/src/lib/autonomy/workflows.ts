import { runTool, type ToolName } from "@/lib/agents/tools";
import type { IndustryPack } from "@/lib/import/config";
import { findDemoOrgId } from "@/lib/data/orgWorkspace";
import { logAgentExecution } from "@/lib/supabase/server";

export type AutonomyWorkflowId =
  | "fefo_weekly"
  | "freight_monthly"
  | "freight_weekly"
  | "control_tower_daily"
  | "dispatch_vrp"
  | "load_build_3d"
  | "full_morning_brief"
  | "medtech_compliance_daily"
  | "planning_pva_weekly"
  | "erp_sync_hourly"
  | "vertical_skills_weekly"
  | "sensing_indent_daily"
  | "network_mip_weekly"
  | "plant_ops_daily"
  | "execution_daily"
  | "rfq_weekly";

export interface WorkflowStep {
  tool: ToolName;
  params?: Record<string, unknown>;
}

export interface WorkflowDef {
  id: AutonomyWorkflowId;
  name: string;
  description: string;
  scheduleHint: string;
  steps: WorkflowStep[];
  hermesRole: string;
  ownerAgentId: string;
  kpis: { id: string; label: string; target: string }[];
}

export const AUTONOMY_WORKFLOWS: WorkflowDef[] = [
  {
    id: "fefo_weekly",
    name: "Weekly FEFO scan",
    description: "Near-expiry lots + approval queue for critical exposure",
    scheduleHint: "Mon 06:00 IST (n8n / Temporal cron)",
    hermesRole: "inventory_guardian",
    ownerAgentId: "ai-inventory-strategist",
    kpis: [
      { id: "critical_lots", label: "Critical lots", target: "< 5" },
      { id: "exposure_inr", label: "Expiry exposure", target: "↓ week-over-week" },
    ],
    steps: [{ tool: "inventory_fefo", params: { horizonDays: 60 } }, { tool: "eo_aging" }, { tool: "control_tower" }],
  },
  {
    id: "freight_monthly",
    name: "Monthly freight audit",
    description: "Full-month invoice leakage recovery candidates",
    scheduleHint: "1st of month 07:00 IST",
    hermesRole: "settlement_auditor",
    ownerAgentId: "ai-settlement-auditor",
    kpis: [{ id: "recoverable_inr", label: "Recoverable freight", target: "> ₹0 disputed" }],
    steps: [{ tool: "freight_audit" }],
  },
  {
    id: "freight_weekly",
    name: "Weekly freight settlement",
    description: "Mid-cycle freight audit so disputes do not wait for month-end",
    scheduleHint: "Wed 07:00 IST",
    hermesRole: "settlement_auditor",
    ownerAgentId: "ai-settlement-auditor",
    kpis: [{ id: "open_disputes", label: "Open disputes", target: "cleared same week" }],
    steps: [{ tool: "freight_audit" }],
  },
  {
    id: "control_tower_daily",
    name: "Daily control tower",
    description: "Exception inbox + pending approvals rollup",
    scheduleHint: "Daily 08:00 IST",
    hermesRole: "visibility_controller",
    ownerAgentId: "ai-visibility-controller",
    kpis: [
      { id: "open_exceptions", label: "Open exceptions", target: "< 20" },
      { id: "pending_approvals", label: "Pending approvals", target: "same-day clear" },
    ],
    steps: [{ tool: "control_tower" }, { tool: "risk_scan" }, { tool: "track_trace" }],
  },
  {
    id: "dispatch_vrp",
    name: "Dispatch + VRP",
    description: "Fill-rate analysis and capacitated routes",
    scheduleHint: "Weekdays 05:30 IST",
    hermesRole: "dispatch_planner",
    ownerAgentId: "ai-dispatch-planner",
    kpis: [
      { id: "avg_fill", label: "Avg fill rate", target: "≥ 85%" },
      { id: "vrp_distance", label: "Route km", target: "↓ vs baseline" },
    ],
    steps: [{ tool: "dispatch_analysis" }, { tool: "fleet_size" }],
  },
  {
    id: "load_build_3d",
    name: "3D load building",
    description: "Extreme-point 3D packing into vehicle containers",
    scheduleHint: "Weekdays 05:45 IST (pre-dispatch)",
    hermesRole: "load_builder",
    ownerAgentId: "ai-load-builder",
    kpis: [{ id: "cube_util", label: "Cube utilization", target: "≥ 75%" }],
    steps: [{ tool: "load_build", params: { vehicleType: "14ft", engine: "3d" } }],
  },
  {
    id: "full_morning_brief",
    name: "Morning brief",
    description: "FEFO + freight + tower + VRP snapshot for planners",
    scheduleHint: "Daily 06:30 IST via Hermes",
    hermesRole: "orchestrator",
    ownerAgentId: "ai-visibility-controller",
    kpis: [{ id: "brief_complete", label: "Brief delivered", target: "by 07:00 IST" }],
    steps: [
      { tool: "inventory_fefo" },
      { tool: "freight_audit" },
      { tool: "control_tower" },
      { tool: "dispatch_analysis" },
    ],
  },
  {
    id: "medtech_compliance_daily",
    name: "MedTech compliance daily",
    description: "Cold-chain GDP + lot mortgage + ATP for regulated SKUs",
    scheduleHint: "Daily 07:15 IST",
    hermesRole: "compliance_officer",
    ownerAgentId: "ai-inventory-strategist",
    kpis: [
      { id: "gdp_pass", label: "GDP pass rate", target: "≥ 98%" },
      { id: "lot_gaps", label: "Lot mortgage gaps", target: "0 critical accounts" },
    ],
    steps: [{ tool: "cold_chain" }, { tool: "lot_mortgage" }, { tool: "atp_allocate" }],
  },
  {
    id: "planning_pva_weekly",
    name: "Weekly plan-vs-actual",
    description: "Forecast compare + PVA + MEIO refresh",
    scheduleHint: "Fri 16:00 IST",
    hermesRole: "planning_controller",
    ownerAgentId: "ai-demand-analyst",
    kpis: [
      { id: "forecast_bias", label: "Forecast bias", target: "|bias| < 10%" },
      { id: "planner_mape", label: "Best planner MAPE", target: "< 20%" },
    ],
    steps: [{ tool: "forecast_compare" }, { tool: "plan_vs_actual" }, { tool: "meio_optimize" }],
  },
  {
    id: "erp_sync_hourly",
    name: "ERP continuous sync",
    description: "Drain write-back queue + pull SAP IDoc feed when ERP_FEED_URL is set",
    scheduleHint: "Hourly at :15 IST",
    hermesRole: "integration_controller",
    ownerAgentId: "ai-visibility-controller",
    kpis: [
      { id: "pending_writebacks", label: "Pending write-backs", target: "0 within 1h" },
      { id: "feed_pull", label: "Inbound feed", target: "hourly when configured" },
    ],
    steps: [{ tool: "erp_continuous_sync" }],
  },
  {
    id: "vertical_skills_weekly",
    name: "Vertical skills weekly",
    description: "TS forecast + DSM + capacity + F&B freshness snapshot",
    scheduleHint: "Wed 09:00 IST",
    hermesRole: "vertical_orchestrator",
    ownerAgentId: "ai-demand-analyst",
    kpis: [
      { id: "mape", label: "Avg best MAPE", target: "< 20%" },
      { id: "shortfall", label: "DSM shortfall", target: "↓ week-over-week" },
    ],
    steps: [
      { tool: "timeseries_forecast" },
      { tool: "demand_supply_match" },
      { tool: "capacity_plan_agg" },
      { tool: "fnb_shelf_life" },
    ],
  },
  {
    id: "sensing_indent_daily",
    name: "Demand sensing + ROP indent",
    description: "Near-term offtake sense then auto-indent proposals for ROP breaches",
    scheduleHint: "Daily 06:00 IST",
    hermesRole: "replenishment_controller",
    ownerAgentId: "ai-replenishment-planner",
    kpis: [
      { id: "sense_alerts", label: "Demand sense alerts", target: "reviewed daily" },
      { id: "indent_breaches", label: "ROP breaches queued", target: "same-day proposals" },
    ],
    steps: [{ tool: "demand_sensing" }, { tool: "auto_indent" }],
  },
  {
    id: "network_mip_weekly",
    name: "Weekly network MIP",
    description: "Facility open/close + flow rebalance candidates",
    scheduleHint: "Tue 10:00 IST",
    hermesRole: "network_planner",
    ownerAgentId: "ai-scenario-planner",
    kpis: [
      { id: "sites_open", label: "Open sites", target: "cost-optimal" },
      { id: "unmet_demand", label: "Unmet demand", target: "0" },
    ],
    steps: [{ tool: "network_optimize" }, { tool: "scenario_baseline" }],
  },
  {
    id: "plant_ops_daily",
    name: "Plant ops daily",
    description: "RCCP overload check + production plan + warehouse dock/slotting",
    scheduleHint: "Weekdays 04:45 IST",
    hermesRole: "plant_controller",
    ownerAgentId: "ai-capacity-planner",
    kpis: [
      { id: "rccp_overloads", label: "RCCP overloads", target: "0 critical" },
      { id: "prod_commit", label: "Production commit", target: "within capacity" },
      { id: "dock_util", label: "Dock util", target: "60–85%" },
    ],
    steps: [{ tool: "rccp" }, { tool: "production_plan" }, { tool: "warehouse_plan" }],
  },
  {
    id: "execution_daily",
    name: "Execution daily",
    description: "ETA prediction + risk scan + ePOD validation wave",
    scheduleHint: "Daily 09:00 IST",
    hermesRole: "execution_controller",
    ownerAgentId: "ai-visibility-controller",
    kpis: [
      { id: "late_eta", label: "Late ETA risk", target: "↓ day-over-day" },
      { id: "high_risks", label: "High risks", target: "< 3" },
      { id: "epod_pending", label: "ePOD pending", target: "same-day clear" },
    ],
    steps: [{ tool: "eta_predict" }, { tool: "risk_scan" }, { tool: "epod_validate" }],
  },
  {
    id: "rfq_weekly",
    name: "Weekly RFQ scoring",
    description: "Multi-criteria carrier/vendor bid score for open RFQs",
    scheduleHint: "Thu 11:00 IST",
    hermesRole: "sourcing_controller",
    ownerAgentId: "ai-sourcing-strategist",
    kpis: [{ id: "rfqs_scored", label: "RFQs scored", target: "all open" }],
    steps: [{ tool: "rfq_score" }],
  },
];

export function getWorkflow(id: string): WorkflowDef | undefined {
  return AUTONOMY_WORKFLOWS.find((w) => w.id === id);
}

export async function runAutonomyWorkflow(opts: {
  workflowId: AutonomyWorkflowId;
  industry?: IndustryPack;
  source?: string;
}) {
  const def = getWorkflow(opts.workflowId);
  if (!def) throw new Error(`Unknown workflow: ${opts.workflowId}`);

  const industry = opts.industry ?? "medtech";
  const orgId = await findDemoOrgId(industry);
  const stepResults: {
    tool: ToolName;
    summary: string;
    confidence: number;
    requiresApproval: boolean;
    data: unknown;
  }[] = [];

  for (const step of def.steps) {
    const result = await runTool(step.tool, {
      industry,
      params: step.params,
      prompt: def.id,
    });
    stepResults.push({
      tool: step.tool,
      summary: result.summary,
      confidence: result.confidence,
      requiresApproval: result.requiresApproval,
      data: result.data,
    });
  }

  const needsApproval = stepResults.some((s) => s.requiresApproval);
  const executionId = await logAgentExecution({
    org_id: orgId ?? undefined,
    agent_id: `hermes:${def.hermesRole}`,
    tool_name: `workflow:${def.id}`,
    input: {
      source: opts.source ?? "autonomy",
      industry,
      workflow: def.id,
      ownerAgentId: def.ownerAgentId,
      kpis: def.kpis,
    },
    output: {
      summary: `${def.name}: ${stepResults.map((s) => s.summary).join(" · ")}`,
      ownerAgentId: def.ownerAgentId,
      kpis: def.kpis,
      steps: stepResults.map((s) => ({
        tool: s.tool,
        summary: s.summary,
        requiresApproval: s.requiresApproval,
        confidence: s.confidence,
      })),
    },
    confidence:
      stepResults.reduce((a, s) => a + s.confidence, 0) / Math.max(stepResults.length, 1),
    requires_approval: needsApproval,
    status: needsApproval ? "needs_approval" : "completed",
  });

  return {
    workflow: def,
    industry,
    executionId,
    needsApproval,
    steps: stepResults,
    ownerAgentId: def.ownerAgentId,
    kpis: def.kpis,
    summary: stepResults.map((s) => s.summary).join(" · "),
  };
}
