/** Yugam intelligence layer — full module & agent catalog (Sarvam orchestrator). */

export type ModulePillar = "predict" | "plan" | "execute";

export type ModuleStatus = "live" | "beta" | "demo";

export interface ProductModule {
  slug: string;
  name: string;
  pillar: ModulePillar;
  tagline: string;
  description: string;
  bullets: string[];
  status: ModuleStatus;
  kpis: { label: string; value: string }[];
  agentIds: string[];
}

export interface WorkforceAgent {
  id: string;
  name: string;
  domain: "planning" | "warehouse" | "transport" | "procurement" | "execution";
  role: string;
  description: string;
  samplePrompts: string[];
}

export const PILLARS: {
  id: ModulePillar;
  label: string;
  blurb: string;
}[] = [
  {
    id: "predict",
    label: "Predict",
    blurb: "Sense demand, model scenarios, balance inventory — before disruption.",
  },
  {
    id: "plan",
    label: "Plan",
    blurb: "Routes, loads, and fleets composed in real time — every constraint weighed.",
  },
  {
    id: "execute",
    label: "Execute",
    blurb: "Watch every mile, mitigate every break, reconcile every invoice.",
  },
];

export const MODULES: ProductModule[] = [
  {
    slug: "demand-forecasting",
    name: "Demand Forecasting",
    pillar: "predict",
    tagline: "Demand signals, decoded",
    description:
      "Autonomous demand forecasting that adapts to seasonality, market shifts, and real-time signals.",
    bullets: [
      "ML-powered demand prediction",
      "Automatic seasonality detection",
      "Continuous accuracy improvement",
    ],
    status: "live",
    kpis: [
      { label: "Forecast lift", value: "+22%" },
      { label: "MAPE (demo)", value: "8.4%" },
      { label: "SKUs covered", value: "257" },
    ],
    agentIds: ["ai-demand-analyst"],
  },
  {
    slug: "scenario-modelling",
    name: "Scenario Modelling",
    pillar: "predict",
    tagline: "Model outcomes before they happen",
    description:
      "Run what-if simulations across demand, capacity, and disruption — then pick the highest-confidence path.",
    bullets: [
      "Multi-variable scenario simulation",
      "Risk-adjusted decision scoring",
      "Side-by-side scenario comparison",
    ],
    status: "live",
    kpis: [
      { label: "Scenarios ready", value: "3" },
      { label: "S&OP cycle", value: "3× faster" },
      { label: "Risk score", value: "Medium" },
    ],
    agentIds: ["ai-scenario-planner"],
  },
  {
    slug: "inventory-optimisation",
    name: "Inventory Optimisation",
    pillar: "predict",
    tagline: "Right stock. Right place. Right time.",
    description:
      "Intelligent inventory orchestration across your network — balancing service levels against holding costs.",
    bullets: [
      "Dynamic safety stock optimization",
      "Multi-echelon inventory planning",
      "Stockout and overstock prevention",
    ],
    status: "live",
    kpis: [
      { label: "Near-expiry lots", value: "Live" },
      { label: "Service level", value: "97.2%" },
      { label: "Excess risk $", value: "$184K" },
    ],
    agentIds: ["ai-inventory-strategist", "ai-inventory-forecaster"],
  },
  {
    slug: "rough-cut-capacity",
    name: "Rough Cut Capacity Planning",
    pillar: "predict",
    tagline: "Validate before you commit",
    description:
      "Check the plan against critical-resource capacity before production and procurement lock in.",
    bullets: [
      "Critical resource bottleneck detection",
      "Capacity vs demand heatmaps",
      "What-if plant load balancing",
    ],
    status: "beta",
    kpis: [
      { label: "Bottlenecks", value: "4" },
      { label: "Utilisation", value: "86%" },
      { label: "Overload weeks", value: "2" },
    ],
    agentIds: ["ai-capacity-planner"],
  },
  {
    slug: "production-planning",
    name: "Intelligent Production Planning",
    pillar: "predict",
    tagline: "AI-sequenced throughput",
    description:
      "AI-sequenced production that maximises throughput and cuts changeovers.",
    bullets: [
      "Constraint-aware sequencing",
      "Changeover minimisation",
      "OEM OTIF alignment",
    ],
    status: "beta",
    kpis: [
      { label: "Machine util.", value: "92%" },
      { label: "OTIF", value: "97%" },
      { label: "Plan cycle", value: "Minutes" },
    ],
    agentIds: ["ai-production-planner"],
  },
  {
    slug: "warehouse-planning",
    name: "Warehouse Planning",
    pillar: "plan",
    tagline: "Warehouses that think ahead",
    description:
      "From inbound scheduling to pick-path optimisation to outbound dock management.",
    bullets: [
      "Smart slotting and pick optimisation",
      "Inbound/outbound dock scheduling",
      "Real-time inventory reconciliation",
    ],
    status: "demo",
    kpis: [
      { label: "Dock turns", value: "+18%" },
      { label: "Pick path ↓", value: "12%" },
      { label: "Open docks", value: "6" },
    ],
    agentIds: ["ai-warehouse-orchestrator"],
  },
  {
    slug: "dispatch-planning",
    name: "Dispatch Planning",
    pillar: "plan",
    tagline: "Every dispatch, orchestrated",
    description:
      "Automated dispatch that weighs vehicle capacity, windows, drivers, and route constraints.",
    bullets: [
      "Constraint-aware scheduling",
      "Real-time capacity matching",
      "Automated carrier assignment",
    ],
    status: "live",
    kpis: [
      { label: "Fill rate", value: "+12%" },
      { label: "Cost / km ↓", value: "11%" },
      { label: "Open dispatches", value: "48" },
    ],
    agentIds: ["ai-dispatch-planner"],
  },
  {
    slug: "3d-load-building",
    name: "3D Load Building",
    pillar: "plan",
    tagline: "Maximize every cubic inch",
    description:
      "Visual 3D load optimisation — weight distribution, stacking rules, unloading sequence.",
    bullets: [
      "3D visual load planning",
      "Weight & balance optimisation",
      "Unloading sequence compliance",
    ],
    status: "demo",
    kpis: [
      { label: "Cube util.", value: "94%" },
      { label: "Weight util.", value: "91%" },
      { label: "Loads today", value: "22" },
    ],
    agentIds: ["ai-load-builder"],
  },
  {
    slug: "fleet-sizing",
    name: "Fleet Sizing & Allocation",
    pillar: "plan",
    tagline: "The right fleet for every route",
    description:
      "Match vehicle types and quantities to demand — eliminate waste and underutilisation.",
    bullets: [
      "Demand-driven fleet optimisation",
      "Vehicle type allocation",
      "Utilisation rate maximisation",
    ],
    status: "demo",
    kpis: [
      { label: "Utilisation", value: "95%" },
      { label: "Idle assets", value: "3" },
      { label: "CapEx freed", value: "25%" },
    ],
    agentIds: ["ai-fleet-strategist"],
  },
  {
    slug: "rfq-bidding",
    name: "RFQ & Bidding",
    pillar: "execute",
    tagline: "Smarter carrier selection, faster",
    description:
      "Automate RFQ from bid creation to evaluation — cost, reliability, and capacity.",
    bullets: [
      "Automated bid solicitation",
      "Multi-criteria carrier scoring",
      "Digital contract awarding",
    ],
    status: "demo",
    kpis: [
      { label: "Open RFQs", value: "7" },
      { label: "Avg savings", value: "6.2%" },
      { label: "Carriers scored", value: "14" },
    ],
    agentIds: ["ai-sourcing-strategist"],
  },
  {
    slug: "control-tower",
    name: "Control Tower",
    pillar: "execute",
    tagline: "Command your entire operation",
    description:
      "Shipments, carriers, exceptions, and KPIs in one view — with AI-recommended actions.",
    bullets: [
      "Unified operations dashboard",
      "Exception-based management",
      "AI-recommended corrective actions",
    ],
    status: "live",
    kpis: [
      { label: "Exceptions", value: "12" },
      { label: "OTIF", value: "94.1%" },
      { label: "Shipments", value: "Live" },
    ],
    agentIds: ["ai-visibility-controller", "ai-resilience-controller"],
  },
  {
    slug: "eta-prediction",
    name: "ETA Prediction",
    pillar: "execute",
    tagline: "Every shipment. Every mile. In real time.",
    description:
      "Multimodal tracking with predictive ETAs that update as reality shifts.",
    bullets: [
      "Multimodal shipment tracking",
      "AI-powered ETA prediction",
      "Automated status notifications",
    ],
    status: "beta",
    kpis: [
      { label: "ETA accuracy", value: "97%" },
      { label: "Late risk", value: "5" },
      { label: "Modes", value: "Road · Sea · Air" },
    ],
    agentIds: ["ai-visibility-controller"],
  },
  {
    slug: "risk-management",
    name: "Risk Management",
    pillar: "execute",
    tagline: "See disruptions before they hit",
    description:
      "Proactive risk across weather, congestion, carrier delays, and compliance gaps.",
    bullets: [
      "Predictive disruption alerts",
      "Multi-factor risk scoring",
      "Automated mitigation workflows",
    ],
    status: "beta",
    kpis: [
      { label: "Active risks", value: "9" },
      { label: "Response ↑", value: "55%" },
      { label: "High severity", value: "2" },
    ],
    agentIds: ["ai-resilience-controller"],
  },
  {
    slug: "epod",
    name: "ePOD",
    pillar: "execute",
    tagline: "Proof of delivery, digitised",
    description:
      "Signatures, photos, timestamps, and condition reports synced back in real time.",
    bullets: [
      "Digital signature capture",
      "Photo & condition documentation",
      "Real-time delivery confirmation",
    ],
    status: "demo",
    kpis: [
      { label: "Digital POD", value: "100%" },
      { label: "Pending sign-off", value: "4" },
      { label: "Exceptions", value: "1" },
    ],
    agentIds: ["ai-pod-validator"],
  },
  {
    slug: "freight-settlement",
    name: "Freight Settlement",
    pillar: "execute",
    tagline: "Settle freight with zero leakage",
    description:
      "Automated freight audit that catches discrepancies and validates contracts.",
    bullets: [
      "Automated invoice reconciliation",
      "Contract compliance validation",
      "Discrepancy detection & resolution",
    ],
    status: "live",
    kpis: [
      { label: "Leakage found", value: "3–5%" },
      { label: "Open disputes", value: "11" },
      { label: "Recoverable $", value: "$42K" },
    ],
    agentIds: ["ai-settlement-auditor"],
  },
];

export const AGENTS: WorkforceAgent[] = [
  {
    id: "ai-demand-analyst",
    name: "AI-Demand Analyst",
    domain: "planning",
    role: "Demand sensing & forecast narratives",
    description: "Builds demand signals, seasonality notes, and SKU risk lists for planners.",
    samplePrompts: [
      "Show stockout risks for next month for top 50 SKUs",
      "Which MedTech SKUs have rising forecast error?",
    ],
  },
  {
    id: "ai-inventory-strategist",
    name: "AI-Inventory Strategist",
    domain: "planning",
    role: "Safety stock & network positioning",
    description: "Balances service level vs holding cost across nodes and lots.",
    samplePrompts: [
      "Which lots expire in 30 days?",
      "Where should we reposition excess CPG inventory?",
    ],
  },
  {
    id: "ai-inventory-forecaster",
    name: "AI-Inventory Forecaster",
    domain: "planning",
    role: "Inventory trajectory forecasts",
    description: "Projects inventory cover days and replenishment windows.",
    samplePrompts: ["Project cover days for DC-North next 8 weeks"],
  },
  {
    id: "ai-replenishment-planner",
    name: "AI-Replenishment Planner",
    domain: "planning",
    role: "Auto-replenishment proposals",
    description: "Drafts PO and transfer proposals with confidence scores.",
    samplePrompts: ["Propose replenishment for stockout-risk SKUs"],
  },
  {
    id: "ai-capacity-planner",
    name: "AI-Capacity Planner",
    domain: "planning",
    role: "Rough-cut capacity checks",
    description: "Flags plant and line overloads before S&OP commit.",
    samplePrompts: ["Which plant should absorb tomorrow's demand spike?"],
  },
  {
    id: "ai-production-planner",
    name: "AI-Production Planner",
    domain: "planning",
    role: "Production sequencing",
    description: "Sequences runs to cut changeovers and hit OEM OTIF.",
    samplePrompts: ["Resequence Line 3 to minimise changeovers this week"],
  },
  {
    id: "ai-scenario-planner",
    name: "AI-Scenario Planner",
    domain: "planning",
    role: "What-if S&OP packs",
    description: "Builds base / upside / downside packs with narratives.",
    samplePrompts: ["Compare base vs disruption scenario for Q3"],
  },
  {
    id: "ai-warehouse-orchestrator",
    name: "AI-Warehouse Orchestrator",
    domain: "warehouse",
    role: "Dock, slotting, pick orchestration",
    description: "Coordinates inbound/outbound docks and pick paths.",
    samplePrompts: ["Schedule docks for tomorrow's outbound wave"],
  },
  {
    id: "ai-inbound-scheduler",
    name: "AI-Inbound Scheduler",
    domain: "warehouse",
    role: "Inbound appointment planning",
    description: "Aligns ASN arrivals with dock and labour capacity.",
    samplePrompts: ["Prioritise inbound ASNs with FEFO risk"],
  },
  {
    id: "ai-network-planner",
    name: "AI-Network Planner",
    domain: "transport",
    role: "Network & lane design",
    description: "Suggests lane and node changes to free CapEx.",
    samplePrompts: ["Where can we cut empty miles on primary freight?"],
  },
  {
    id: "ai-dispatch-planner",
    name: "AI-Dispatch Planner",
    domain: "transport",
    role: "Dispatch & route sequencing",
    description: "Assigns vehicles and sequences stops under constraints.",
    samplePrompts: ["Which carrier should I award for lane MUM-DEL?"],
  },
  {
    id: "ai-load-builder",
    name: "AI-Load Builder",
    domain: "transport",
    role: "3D load optimisation",
    description: "Builds cube-aware loads with unload sequence rules.",
    samplePrompts: ["Build a max-cube load for trailer T-204"],
  },
  {
    id: "ai-fleet-strategist",
    name: "AI-Fleet Strategist",
    domain: "transport",
    role: "Fleet sizing & mix",
    description: "Rightsizes fleet mix against demand volatility.",
    samplePrompts: ["Do we need more 32ft vehicles next month?"],
  },
  {
    id: "ai-visibility-controller",
    name: "AI-Visibility Controller",
    domain: "execution",
    role: "Live shipment visibility & ETA",
    description: "Tracks multimodal shipments and updates ETAs.",
    samplePrompts: ["Which shipments should be delayed or expedited?"],
  },
  {
    id: "ai-resilience-controller",
    name: "AI-Resilience Controller",
    domain: "execution",
    role: "Risk & mitigation",
    description: "Scores disruptions and proposes mitigation paths.",
    samplePrompts: ["List high-severity risks for the next 72 hours"],
  },
  {
    id: "ai-sourcing-strategist",
    name: "AI-Sourcing Strategist",
    domain: "procurement",
    role: "RFQ & carrier award",
    description: "Runs multi-criteria RFQ scoring and award drafts.",
    samplePrompts: ["Score open RFQs by cost and OTIF reliability"],
  },
  {
    id: "ai-settlement-auditor",
    name: "AI-Settlement Auditor",
    domain: "procurement",
    role: "Freight audit & recovery",
    description: "Reconciles invoices vs contracts and flags leakage.",
    samplePrompts: ["Which invoices shouldn't I pay this week?"],
  },
  {
    id: "ai-pod-validator",
    name: "AI-POD Validator",
    domain: "execution",
    role: "ePOD quality checks",
    description: "Validates digital POD completeness and exceptions.",
    samplePrompts: ["Show POD exceptions from yesterday"],
  },
  {
    id: "ai-yard-coordinator",
    name: "AI-Yard Coordinator",
    domain: "warehouse",
    role: "Yard & gate flow",
    description: "Coordinates yard slots, detention risk, and gate turns.",
    samplePrompts: ["Which trailers risk detention fees today?"],
  },
];

export const INDUSTRIES = [
  "Automotive (Autoparts)",
  "FMCG / Consumer Goods",
  "Manufacturing",
  "Cement & Building Materials",
  "Energy & Utilities",
  "Metals & Mining",
  "Pharmaceuticals",
  "MedTech / Diagnostics",
  "Technology",
  "Logistics & 3PL",
  "Other",
] as const;

export const OUTCOMES = [
  {
    sector: "Manufacturing",
    title: "CapEx, released.",
    body: "Network redesign and inventory repositioning, releasing capital tied up in excess nodes.",
    metric: "25%",
    metricLabel: "CapEx reduction",
  },
  {
    sector: "FMCG",
    title: "Payback, accelerated.",
    body: "Mid-market rollouts hit cumulative savings equal to total program cost inside four months.",
    metric: "<4 mo",
    metricLabel: "Median payback",
  },
  {
    sector: "Chemicals & Logistics",
    title: "Freight, compounded down.",
    body: "Dynamic dispatch, load-matching, and lane optimisation compounding across every shipment.",
    metric: "8–15%",
    metricLabel: "Freight cost ↓",
  },
];

export const COMPARISON_ROWS = [
  {
    capability: "Architecture",
    yugam: "Intelligence layer · agentic",
    suites: "Retrofit AI on SaaS",
    tpl: "Spreadsheet + ERP",
  },
  {
    capability: "Decisioning",
    yugam: "Autonomous · continuous",
    suites: "Operator-triggered batch",
    tpl: "People in rooms",
  },
  {
    capability: "Supply chain planning",
    yugam: "7 native modules",
    suites: "1–2 point tools",
    tpl: "Spreadsheets",
  },
  {
    capability: "Logistics execution",
    yugam: "6 native modules",
    suites: "Bolt-on only",
    tpl: "Outsourced to 3PLs",
  },
  {
    capability: "Unifies existing systems",
    yugam: "Layer over ERP/TMS/WMS",
    suites: "Rip-and-replace",
    tpl: "Manual handoff",
  },
  {
    capability: "Time to value",
    yugam: "2–4 months",
    suites: "12–24 months",
    tpl: "Multi-year SOW",
  },
  {
    capability: "Pre-emptive action",
    yugam: "Built-in",
    suites: "Limited",
    tpl: "Reactive",
  },
  {
    capability: "Security",
    yugam: "SOC 2 · ISO 27001 path",
    suites: "Varies",
    tpl: "Varies",
  },
];

export const PIPELINE_STAGES = [
  {
    step: "01",
    title: "Connect",
    subtitle: "Data Ingestion",
    items: ["ERP integration", "WMS connectors", "TMS feeds", "IoT telemetry"],
  },
  {
    step: "02",
    title: "Transform",
    subtitle: "Feature Engineering",
    items: ["Data cleaning", "Normalization", "Feature extraction", "Quality scoring"],
  },
  {
    step: "03",
    title: "Reason",
    subtitle: "Model Intelligence",
    items: ["Demand models", "Route optimisation", "Anomaly detection", "GNN analysis"],
  },
  {
    step: "04",
    title: "Decide",
    subtitle: "Decision Engine",
    items: ["Constraint solving", "Pareto optimisation", "Risk scoring", "Confidence intervals"],
  },
  {
    step: "05",
    title: "Execute",
    subtitle: "Action & Feedback",
    items: ["Auto-dispatch", "Approval workflows", "Learning loops", "Audit trails"],
  },
] as const;

export function getModule(slug: string): ProductModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function modulesByPillar(pillar: ModulePillar): ProductModule[] {
  return MODULES.filter((m) => m.pillar === pillar);
}

export function getAgent(id: string): WorkforceAgent | undefined {
  return AGENTS.find((a) => a.id === id);
}
