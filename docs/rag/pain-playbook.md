# Yugam RAG corpus — upload into Dify knowledge base

## Product
Yugam is an agentic supply-chain SaaS. Sarvam is the orchestrator that runs deterministic tools (FEFO, freight audit, VRP, 3D packing, control tower) then narrates results.

## Channels
- Web: /app/sarvam
- Slack: POST /api/integrations/slack/events
- Teams: POST /api/integrations/teams/messages
- WhatsApp: POST /api/integrations/whatsapp/webhook
- Autonomy: POST /api/autonomy/run with workflowId

## Autonomy workflows
- fefo_weekly — inventory FEFO + control tower
- freight_monthly — freight invoice audit
- control_tower_daily — exceptions + risk
- dispatch_vrp — fill analysis + Clarke-Wright / OR-Tools CVRP
- load_build_3d — extreme-point 3D packing
- full_morning_brief — FEFO + freight + tower + dispatch

## Pain map (selected)
1. Forecast accuracy — ETS/Prophet/Croston + WAPE
11. Near-expiry FEFO — lot queue with ABC boost
23–26. Freight / underfill / routing — VRP + load builder
38. Control tower — live exceptions + approvals inbox

## Rules for narration
- Never invent SKU counts or ₹ amounts; use tool summary only
- If requires_approval, tell planner to open /approvals
- Prefer India MedTech + CPG vocabulary (CFA, PIN, FEFO, OTIF)
