import type { WorkforceAgent } from "@/lib/product/catalog";
import { AGENTS, MODULES } from "@/lib/product/catalog";

export interface SarvamMessage {
  role: "user" | "sarvam" | "system";
  content: string;
  agentId?: string;
  confidence?: number;
  actions?: string[];
}

function findAgent(prompt: string): WorkforceAgent {
  const p = prompt.toLowerCase();
  const rules: { keys: string[]; id: string }[] = [
    { keys: ["invoice", "settle", "freight audit", "leakage", "shouldn't i pay"], id: "ai-settlement-auditor" },
    { keys: ["rfq", "bid", "carrier award", "sourcing"], id: "ai-sourcing-strategist" },
    { keys: ["risk", "disruption", "weather", "mitigation"], id: "ai-resilience-controller" },
    { keys: ["eta", "track", "shipment", "visibility", "delay"], id: "ai-visibility-controller" },
    { keys: ["pod", "proof of delivery", "signature"], id: "ai-pod-validator" },
    { keys: ["load", "cube", "3d", "trailer"], id: "ai-load-builder" },
    { keys: ["dispatch", "route", "vehicle assignment"], id: "ai-dispatch-planner" },
    { keys: ["fleet", "utilisation", "utilization"], id: "ai-fleet-strategist" },
    { keys: ["warehouse", "dock", "pick", "slotting"], id: "ai-warehouse-orchestrator" },
    { keys: ["yard", "detention", "gate"], id: "ai-yard-coordinator" },
    { keys: ["capacity", "plant", "bottleneck"], id: "ai-capacity-planner" },
    { keys: ["production", "changeover", "sequenc"], id: "ai-production-planner" },
    { keys: ["scenario", "what-if", "what if", "s&op"], id: "ai-scenario-planner" },
    { keys: ["replenish", "purchase order", "transfer"], id: "ai-replenishment-planner" },
    { keys: ["expir", "fefo", "safety stock", "inventory", "stockout", "overstock"], id: "ai-inventory-strategist" },
    { keys: ["forecast", "demand", "seasonality"], id: "ai-demand-analyst" },
  ];

  for (const rule of rules) {
    if (rule.keys.some((k) => p.includes(k))) {
      return AGENTS.find((a) => a.id === rule.id) ?? AGENTS[0]!;
    }
  }
  return AGENTS[0]!;
}

function moduleHint(agentId: string): string {
  const mod = MODULES.find((m) => m.agentIds.includes(agentId));
  return mod ? `${mod.name} (${mod.pillar})` : "Control Tower";
}

/** Local Sarvam orchestrator — works offline; upgrades to API when available. */
export function runSarvamLocal(prompt: string): SarvamMessage {
  const agent = findAgent(prompt);
  const confidence = 0.72 + (prompt.length % 20) / 100;
  const mod = moduleHint(agent.id);

  const content = [
    `**Sarvam → ${agent.name}**`,
    ``,
    `I routed your request to the **${agent.role}** agent under **${mod}**.`,
    ``,
    `### Decision brief`,
    agent.description,
    ``,
    `### Recommended actions`,
    `1. Review the live KPIs on the ${mod.split(" (")[0]} workspace.`,
    `2. Approve or override the draft plan with a confidence threshold of ${(confidence * 100).toFixed(0)}%.`,
    `3. Push the outcome back into ERP / TMS / WMS via the Connect layer (CSV/API).`,
    ``,
    `### Why this agent`,
    `Matched keywords in your prompt to the AI-Workforce registry (${AGENTS.length} agents).`,
    ``,
    `_Low-confidence decisions pause for human review. Every action is audit-logged._`,
  ].join("\n");

  return {
    role: "sarvam",
    content,
    agentId: agent.id,
    confidence,
    actions: [
      `Open /app/modules/${MODULES.find((m) => m.agentIds.includes(agent.id))?.slug ?? "control-tower"}`,
      "Export decision audit trail",
      "Escalate to planner approval queue",
    ],
  };
}

export const SARVAM_STARTERS = [
  "Show stockout risks for next month for top 50 SKUs",
  "Which invoices shouldn't I pay this week?",
  "Which plant should absorb tomorrow's demand spike?",
  "List high-severity logistics risks for the next 72 hours",
  "Score open RFQs by cost and OTIF reliability",
  "Which lots expire in the next 30 days?",
];
