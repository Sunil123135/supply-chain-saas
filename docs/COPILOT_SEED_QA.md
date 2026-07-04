# Nexova Flow — Copilot Seed Q&As (M1–M9)

Generated: 2026-07-03 10:36 UTC

> Maps each module to **Tier 1 intel clusters** + **3 canonical seed questions** per module.
> Load into M7 Knowledge Base and Copilot system prompt at deploy.

---

## M1 — Demand Forecasting

**Nexova pains covered:** #1, #2, #3, #4, #5, #6, #7, #47
**Copilot tools:** `get_forecast_accuracy, run_demand_forecast, list_sku_forecasts`
**Tier 1 clusters mapped:** 28

### Canonical seed questions (always ship with module)

**Q1.** What is our MAPE by SKU and planner for the last 8 weeks?
- *Expected:* Pull forecast vs actuals from M1, group by SKU and planner, return MAPE/WAPE with trend vs prior period. Flag SKUs above target.

**Q2.** Which SKUs have intermittent demand and need Croston/TSB instead of Prophet?
- *Expected:* Scan demand history for zero-inflation and ADI/CV²; list candidates with recommended model and confidence.

**Q3.** Show me forecast silos — where do sales, finance, and supply chain numbers disagree?
- *Expected:* Compare consensus forecast versions by source; highlight largest gaps by revenue impact.

### Tier 1 intel cluster Q&As

**T1-1.** How does Nexova Demand Forecasting address: Forecast lives in silos — sales, finance, and SC each have their own number?
- *Pain #:* 6 — Forecast lives in silos — sales, finance, and SC each have their own number
- *Market signal:* RICE 2.5767, 3 mentions, 2 videos
- *Evidence:* But the real challenge is deciding where to cut.
- *Expected:* Tier-1 market signal (RICE 2.6, 3 mentions / 2 videos). Maps to Nexova pain #6. Use tools: get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Monitor KPIs: ** S&OP, forecast accuracy. Evidence: But the real challenge is deciding where to cut.

**T1-2.** How does Nexova Demand Forecasting address: Forecast accuracy is poor; Excel forecasts miss demand shifts?
- *Pain #:* 1 — Forecast accuracy is poor; Excel forecasts miss demand shifts
- *Market signal:* RICE 2.1438, 3 mentions, 2 videos
- *Evidence:* For many warehouse fulfillment leaders, the challenge is no fulfillment leaders, the challenge is no fulfillment leaders, the challenge is no longer optimizing for a steady state.
- *Expected:* Tier-1 market signal (RICE 2.1, 3 mentions / 2 videos). Maps to Nexova pain #1. Use tools: get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Monitor KPIs: ** service level, forecast accuracy. Evidence: For many warehouse fulfillment leaders, the challenge is no fulfillment leaders, the challenge is no fulfillment leaders, the challenge is no longer optimizing…

**T1-3.** How does Nexova Demand Forecasting address: Master data errors (lead times, MOQs, weights) poison every plan?
- *Pain #:* 47 — Master data errors (lead times, MOQs, weights) poison every plan
- *Market signal:* RICE 1.7668, 4 mentions, 2 videos
- *Evidence:* A lot AI is a bigger challenge, right?
- *Expected:* Tier-1 market signal (RICE 1.8, 4 mentions / 2 videos). Maps to Nexova pain #47. Use tools: get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Monitor KPIs: ** service level, lead time. Evidence: A lot AI is a bigger challenge, right?

**T1-4.** How does Nexova Demand Forecasting address: Forecast lives in silos — sales, finance, and SC each have their own number?
- *Pain #:* 6 — Forecast lives in silos — sales, finance, and SC each have their own number
- *Market signal:* RICE 0.6972, 1 mentions, 1 videos
- *Evidence:* For problems on the division of labor.
- *Expected:* Tier-1 market signal (RICE 0.7, 1 mentions / 1 videos). Maps to Nexova pain #6. Use tools: get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Monitor KPIs: ** S&OP, lead time. Evidence: For problems on the division of labor.

**T1-5.** How does Nexova Demand Forecasting address: Forecast accuracy is poor; Excel forecasts miss demand shifts?
- *Pain #:* 1 — Forecast accuracy is poor; Excel forecasts miss demand shifts
- *Market signal:* RICE 0.6255, 1 mentions, 1 videos
- *Evidence:* If a shipment is delayed, it ETA.
- *Expected:* Tier-1 market signal (RICE 0.6, 1 mentions / 1 videos). Maps to Nexova pain #1. Use tools: get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Monitor KPIs: ** Service level, Forecast accuracy, lead time. Evidence: If a shipment is delayed, it ETA.

### Build-pack pains (seed until intel validates)

**Pack #2.** How should we handle: No demand sensing — quick-commerce/channel spikes surprise us?
- *Expected:* Answer from Nexova Demand Forecasting playbook (pain #2). Use get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Cite KB SOP if uploaded.

**Pack #3.** How should we handle: Intermittent/lumpy demand (spares, reagents) breaks normal models?
- *Expected:* Answer from Nexova Demand Forecasting playbook (pain #3). Use get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Cite KB SOP if uploaded.

**Pack #4.** How should we handle: New product launches have zero history to forecast from?
- *Expected:* Answer from Nexova Demand Forecasting playbook (pain #4). Use get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Cite KB SOP if uploaded.

**Pack #5.** How should we handle: Promotions/seasonality distort baseline demand?
- *Expected:* Answer from Nexova Demand Forecasting playbook (pain #5). Use get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Cite KB SOP if uploaded.

**Pack #7.** How should we handle: No forecast accountability — nobody measures MAPE by planner?
- *Expected:* Answer from Nexova Demand Forecasting playbook (pain #7). Use get_forecast_accuracy, run_demand_forecast, list_sku_forecasts. Cite KB SOP if uploaded.

---

## M2 — Inventory Optimization

**Nexova pains covered:** #8, #9, #10, #11, #12, #13, #14, #15, #16
**Copilot tools:** `get_safety_stock, list_eo_alerts, get_inventory_position`
**Tier 1 clusters mapped:** 34

### Canonical seed questions (always ship with module)

**Q1.** Where do we have stockouts on A-items while C-items are overstocked?
- *Expected:* Join inventory position with ABC class and days-of-supply; rank nodes by service risk and excess capital.

**Q2.** Which batches are within 60 days of expiry and need FEFO action?
- *Expected:* List near-expiry lots by node with recommended transfer, markdown, or destruction per policy.

**Q3.** Recalculate safety stock for top 20 SKUs using current lead-time variability.
- *Expected:* Call optimizer service for dynamic SS/ROP; show delta vs current policy and working-capital impact.

### Tier 1 intel cluster Q&As

**T1-1.** How does Nexova Inventory Optimization address: Allocation during shortage is political, not rule-based?
- *Pain #:* 16 — Allocation during shortage is political, not rule-based
- *Market signal:* RICE 2.3695, 3 mentions, 2 videos
- *Evidence:* Uh, and there's no shortage of topics.
- *Expected:* Tier-1 market signal (RICE 2.4, 3 mentions / 2 videos). Maps to Nexova pain #16. Use tools: get_safety_stock, list_eo_alerts, get_inventory_position. Monitor KPIs: ** lead time. Evidence: Uh, and there's no shortage of topics.

**T1-2.** How does Nexova Inventory Optimization address: Allocation during shortage is political, not rule-based?
- *Pain #:* 16 — Allocation during shortage is political, not rule-based
- *Market signal:* RICE 1.3114, 1 mentions, 1 videos
- *Evidence:* D365 offers a supply risk assessment workspace that, alongside performance and risk analysis report, can assist in understanding risk of sourcing shortages and delays.
- *Expected:* Tier-1 market signal (RICE 1.3, 1 mentions / 1 videos). Maps to Nexova pain #16. Use tools: get_safety_stock, list_eo_alerts, get_inventory_position. Monitor KPIs: service level, cost. Evidence: D365 offers a supply risk assessment workspace that, alongside performance and risk analysis report, can assist in understanding risk of sourcing shortages and…

**T1-3.** How does Nexova Inventory Optimization address: Allocation during shortage is political, not rule-based?
- *Pain #:* 16 — Allocation during shortage is political, not rule-based
- *Market signal:* RICE 1.1823, 2 mentions, 2 videos
- *Evidence:* Labor shortages specifically on chain.
- *Expected:* Tier-1 market signal (RICE 1.2, 2 mentions / 2 videos). Maps to Nexova pain #16. Use tools: get_safety_stock, list_eo_alerts, get_inventory_position. Monitor KPIs: ** service level, lead time, forecast accuracy. Evidence: Labor shortages specifically on chain.

**T1-4.** How does Nexova Inventory Optimization address: Safety stocks are static, set years ago, never recalculated?
- *Pain #:* 9 — Safety stocks are static, set years ago, never recalculated
- *Market signal:* RICE 1.1013, 1 mentions, 1 videos
- *Evidence:* You know, it's um probably I don't know maybe don't know maybe don't know maybe at least seven or eight years ago while at least seven or eight years ago while at least seven or eight years ago while…
- *Expected:* Tier-1 market signal (RICE 1.1, 1 mentions / 1 videos). Maps to Nexova pain #9. Use tools: get_safety_stock, list_eo_alerts, get_inventory_position. Monitor KPIs: service level, cost. Evidence: You know, it's um probably I don't know maybe don't know maybe don't know maybe at least seven or eight years ago while at least seven or eight years ago while…

**T1-5.** How does Nexova Inventory Optimization address: Allocation during shortage is political, not rule-based?
- *Pain #:* 16 — Allocation during shortage is political, not rule-based
- *Market signal:* RICE 1.0736, 1 mentions, 1 videos
- *Evidence:* If you want to understand inflation, shortages, logistics breakdowns, semiconductor dependence, shipping bottlenecks, and why modern abundance feels more fragile than ever, this video connects the do…
- *Expected:* Tier-1 market signal (RICE 1.1, 1 mentions / 1 videos). Maps to Nexova pain #16. Use tools: get_safety_stock, list_eo_alerts, get_inventory_position. Monitor KPIs: service level, cost. Evidence: If you want to understand inflation, shortages, logistics breakdowns, semiconductor dependence, shipping bottlenecks, and why modern abundance feels more fragi…

### Build-pack pains (seed until intel validates)

**Pack #8.** How should we handle: Stockouts on fast movers while slow movers pile up?
- *Expected:* Answer from Nexova Inventory Optimization playbook (pain #8). Use get_safety_stock, list_eo_alerts, get_inventory_position. Cite KB SOP if uploaded.

**Pack #10.** How should we handle: Excess & obsolete (E&O) inventory quietly eats margin?
- *Expected:* Answer from Nexova Inventory Optimization playbook (pain #10). Use get_safety_stock, list_eo_alerts, get_inventory_position. Cite KB SOP if uploaded.

**Pack #11.** How should we handle: Near-expiry stock discovered too late to liquidate (FEFO failures)?
- *Expected:* Answer from Nexova Inventory Optimization playbook (pain #11). Use get_safety_stock, list_eo_alerts, get_inventory_position. Cite KB SOP if uploaded.

**Pack #12.** How should we handle: No multi-echelon view — every node buffers independently?
- *Expected:* Answer from Nexova Inventory Optimization playbook (pain #12). Use get_safety_stock, list_eo_alerts, get_inventory_position. Cite KB SOP if uploaded.

**Pack #13.** How should we handle: Working capital locked in wrong SKUs at wrong nodes?
- *Expected:* Answer from Nexova Inventory Optimization playbook (pain #13). Use get_safety_stock, list_eo_alerts, get_inventory_position. Cite KB SOP if uploaded.

---

## M3 — Auto-Replenishment

**Nexova pains covered:** #17, #18, #19, #20, #21, #22
**Copilot tools:** `list_replen_proposals, approve_replenishment, get_plan_vs_actual`
**Tier 1 clusters mapped:** 3

### Canonical seed questions (always ship with module)

**Q1.** What replenishment proposals are waiting for my approval right now?
- *Expected:* Return open auto-indent queue with SKU, node, qty, reason (ROP breach, forecast uplift, promo), and urgency score.

**Q2.** Why did we miss plan vs actual on replenishment last month?
- *Expected:* Compare proposed vs approved vs received POs/STOs; attribute gaps to forecast error, lead time, or approval delay.

**Q3.** Which exceptions should planners tackle first today?
- *Expected:* Rank replenishment exceptions by revenue at risk and SLA breach probability.

### Tier 1 intel cluster Q&As

**T1-1.** How does Nexova Auto-Replenishment address: No auto-indent — every PO/STO needs manual triggering?
- *Pain #:* 18 — No auto-indent — every PO/STO needs manual triggering
- *Market signal:* RICE 0.479, 1 mentions, 1 videos
- *Evidence:* Sales order processing involves: a) the receipt of customer purchase orders either manually or via EDI, b) order data verification, and c) the generation of sales orders in the ERP system.
- *Expected:* Tier-1 market signal (RICE 0.5, 1 mentions / 1 videos). Maps to Nexova pain #18. Use tools: list_replen_proposals, approve_replenishment, get_plan_vs_actual. Monitor KPIs: service level, cost. Evidence: Sales order processing involves: a) the receipt of customer purchase orders either manually or via EDI, b) order data verification, and c) the generation of sa…

**T1-2.** How does Nexova Auto-Replenishment address: Upstream RM/packaging planning disconnected from FG demand?
- *Pain #:* 20 — Upstream RM/packaging planning disconnected from FG demand
- *Market signal:* RICE 0.4698, 1 mentions, 1 videos
- *Evidence:* From fragmented data and disconnected workflows to the growing importance of supplier visibility and risk intelligence, the discussion explores what separates companies that react to disruption from …
- *Expected:* Tier-1 market signal (RICE 0.5, 1 mentions / 1 videos). Maps to Nexova pain #20. Use tools: list_replen_proposals, approve_replenishment, get_plan_vs_actual. Monitor KPIs: ** lead time. Evidence: From fragmented data and disconnected workflows to the growing importance of supplier visibility and risk intelligence, the discussion explores what separates …

**T1-3.** How does Nexova Auto-Replenishment address: Upstream RM/packaging planning disconnected from FG demand?
- *Pain #:* 20 — Upstream RM/packaging planning disconnected from FG demand
- *Market signal:* RICE 0.4218, 1 mentions, 1 videos
- *Evidence:* One of the big problems they've got to solve is that grocery packaging is designed for people, and the interactions between all the objects they deal with can be...
- *Expected:* Tier-1 market signal (RICE 0.4, 1 mentions / 1 videos). Maps to Nexova pain #20. Use tools: list_replen_proposals, approve_replenishment, get_plan_vs_actual. Monitor KPIs: service level, cost. Evidence: One of the big problems they've got to solve is that grocery packaging is designed for people, and the interactions between all the objects they deal with can …

### Build-pack pains (seed until intel validates)

**Pack #17.** How should we handle: Planners spend 80% of time on routine replenishment math?
- *Expected:* Answer from Nexova Auto-Replenishment playbook (pain #17). Use list_replen_proposals, approve_replenishment, get_plan_vs_actual. Cite KB SOP if uploaded.

**Pack #19.** How should we handle: Planning cycle too slow (monthly when weekly is needed)?
- *Expected:* Answer from Nexova Auto-Replenishment playbook (pain #19). Use list_replen_proposals, approve_replenishment, get_plan_vs_actual. Cite KB SOP if uploaded.

**Pack #21.** How should we handle: No exception management — everything is treated as equally urgent?
- *Expected:* Answer from Nexova Auto-Replenishment playbook (pain #21). Use list_replen_proposals, approve_replenishment, get_plan_vs_actual. Cite KB SOP if uploaded.

**Pack #22.** How should we handle: Plan vs actual is never tracked, so plans never improve?
- *Expected:* Answer from Nexova Auto-Replenishment playbook (pain #22). Use list_replen_proposals, approve_replenishment, get_plan_vs_actual. Cite KB SOP if uploaded.

---

## M4 — Dispatch & Freight

**Nexova pains covered:** #23, #24, #25, #26, #27, #28, #29, #30, #31
**Copilot tools:** `optimize_routes, compare_ftl_ltl, audit_freight_invoice`
**Tier 1 clusters mapped:** 4

### Canonical seed questions (always ship with module)

**Q1.** Build today's dispatch plan with best fill rate and lowest freight cost.
- *Expected:* Run route + load optimization; compare FTL vs LTL options with cost per case and cube utilization.

**Q2.** Audit last month's freight invoices — where are we likely overbilled?
- *Expected:* Match invoices to rate cards and dispatched loads; flag variances above tolerance.

**Q3.** How did actual dispatch deviate from plan this week?
- *Expected:* Show plan-vs-actual by lane: on-time %, fill rate, cost variance, and root cause tags.

### Tier 1 intel cluster Q&As

**T1-1.** How does Nexova Dispatch & Freight address: No dispatch plan-vs-actual — deviations compound silently?
- *Pain #:* 30 — No dispatch plan-vs-actual — deviations compound silently
- *Market signal:* RICE 5.8464, 3 mentions, 3 videos
- *Evidence:* Fleet, dispatch, safety, compliance, carrier relationships, and compliance, carrier relationships, and compliance, carrier relationships, and governance.
- *Expected:* Tier-1 market signal (RICE 5.8, 3 mentions / 3 videos). Maps to Nexova pain #30. Use tools: optimize_routes, compare_ftl_ltl, audit_freight_invoice. Monitor KPIs: ** OTIF. Evidence: Fleet, dispatch, safety, compliance, carrier relationships, and compliance, carrier relationships, and compliance, carrier relationships, and governance.

**T1-2.** How does Nexova Dispatch & Freight address: Cold-chain excursions found on arrival, not in transit?
- *Pain #:* 41 — Cold-chain excursions found on arrival, not in transit
- *Market signal:* RICE 2.8066, 5 mentions, 3 videos
- *Evidence:* Challenges in the vaccine cold chain in many developing countries cold chain in many developing countries cold chain in many developing countries ultra cold capacity is limited.
- *Expected:* Tier-1 market signal (RICE 2.8, 5 mentions / 3 videos). Maps to Nexova pain #41. Use tools: optimize_routes, compare_ftl_ltl, audit_freight_invoice. Monitor KPIs: service level, cost. Evidence: Challenges in the vaccine cold chain in many developing countries cold chain in many developing countries cold chain in many developing countries ultra cold ca…

**T1-3.** How does Nexova Dispatch & Freight address: Route selection is habit, not optimization?
- *Pain #:* 26 — Route selection is habit, not optimization
- *Market signal:* RICE 0.6872, 1 mentions, 1 videos
- *Evidence:* Transportation route optimization solve critical challenges optimization solve critical challenges optimization solve critical challenges related to cost, delivery, speed, related to cost, delivery, …
- *Expected:* Tier-1 market signal (RICE 0.7, 1 mentions / 1 videos). Maps to Nexova pain #26. Use tools: optimize_routes, compare_ftl_ltl, audit_freight_invoice. Monitor KPIs: ** OTIF, service level, perfect order. Evidence: Transportation route optimization solve critical challenges optimization solve critical challenges optimization solve critical challenges related to cost, deli…

**T1-4.** How does Nexova Dispatch & Freight address: Freight cost varies by which planner built the load?
- *Pain #:* 23 — Freight cost varies by which planner built the load
- *Market signal:* RICE 0.4866, 1 mentions, 1 videos
- *Evidence:* Here’s what you’ll learn: 🌍 How regional conflicts disrupt global trade routes 🚢 Why shipping lanes suddenly become high-risk zones ⛽ The impact on fuel prices and freight costs 📦 How cargo delays ri…
- *Expected:* Tier-1 market signal (RICE 0.5, 1 mentions / 1 videos). Maps to Nexova pain #23. Use tools: optimize_routes, compare_ftl_ltl, audit_freight_invoice. Monitor KPIs: service level, cost. Evidence: Here’s what you’ll learn: 🌍 How regional conflicts disrupt global trade routes 🚢 Why shipping lanes suddenly become high-risk zones ⛽ The impact on fuel prices…

### Build-pack pains (seed until intel validates)

**Pack #24.** How should we handle: Vehicles dispatched underfilled — poor fill rate?
- *Expected:* Answer from Nexova Dispatch & Freight playbook (pain #24). Use optimize_routes, compare_ftl_ltl, audit_freight_invoice. Cite KB SOP if uploaded.

**Pack #25.** How should we handle: FTL vs LTL decision never systematically evaluated?
- *Expected:* Answer from Nexova Dispatch & Freight playbook (pain #25). Use optimize_routes, compare_ftl_ltl, audit_freight_invoice. Cite KB SOP if uploaded.

**Pack #27.** How should we handle: No 3D load building — cube utilization unknown?
- *Expected:* Answer from Nexova Dispatch & Freight playbook (pain #27). Use optimize_routes, compare_ftl_ltl, audit_freight_invoice. Cite KB SOP if uploaded.

**Pack #28.** How should we handle: Freight invoices unaudited — overbilling goes undetected?
- *Expected:* Answer from Nexova Dispatch & Freight playbook (pain #28). Use optimize_routes, compare_ftl_ltl, audit_freight_invoice. Cite KB SOP if uploaded.

**Pack #29.** How should we handle: Mode choice (air vs ocean vs road) ignores inventory value math?
- *Expected:* Answer from Nexova Dispatch & Freight playbook (pain #29). Use optimize_routes, compare_ftl_ltl, audit_freight_invoice. Cite KB SOP if uploaded.

---

## M5 — Copilot

**Nexova pains covered:** #39, #46, #48, #50
**Copilot tools:** `copilot_chat, run_scenario, get_audit_trail`
**Tier 1 clusters mapped:** 5

### Canonical seed questions (always ship with module)

**Q1.** Where is order SO-10482 and when will it arrive?
- *Expected:* Trace order across planning, inventory, and dispatch; cite source systems and last scan.

**Q2.** What if demand for SKU-4412 increases 15% for the next quarter?
- *Expected:* Run scenario through forecast → inventory → replenishment; summarize service level and cash impact (human approval before writes).

**Q3.** Who approved the last replenishment override and why?
- *Expected:* Pull audit log entry with user, timestamp, before/after values, and linked exception.

### Tier 1 intel cluster Q&As

**T1-1.** How does Nexova Copilot address: Every insight requires asking an analyst and waiting?
- *Pain #:* 46 — Every insight requires asking an analyst and waiting
- *Market signal:* RICE 0.8143, 1 mentions, 1 videos
- *Evidence:* Backlog includes orders waiting for Backlog includes orders waiting for Backlog includes orders waiting for production, orders waiting for production, orders waiting for production, orders waiting fo…
- *Expected:* Tier-1 market signal (RICE 0.8, 1 mentions / 1 videos). Maps to Nexova pain #46. Use tools: copilot_chat, run_scenario, get_audit_trail. Monitor KPIs: ** forecast accuracy, service level, S&OP. Evidence: Backlog includes orders waiting for Backlog includes orders waiting for Backlog includes orders waiting for production, orders waiting for production, orders w…

**T1-2.** How does Nexova Copilot address: No audit trail of who decided what, when, and why?
- *Pain #:* 50 — No audit trail of who decided what, when, and why
- *Market signal:* RICE 0.7299, 1 mentions, 1 videos
- *Evidence:* Whether you’re working in pharma logistics, quality assurance, or regulatory compliance, this quick explainer gives you a clear view of how traceability works in practice and why it matters.
- *Expected:* Tier-1 market signal (RICE 0.7, 1 mentions / 1 videos). Maps to Nexova pain #50. Use tools: copilot_chat, run_scenario, get_audit_trail. Monitor KPIs: service level, cost. Evidence: Whether you’re working in pharma logistics, quality assurance, or regulatory compliance, this quick explainer gives you a clear view of how traceability works …

**T1-3.** How does Nexova Copilot address: Every insight requires asking an analyst and waiting?
- *Pain #:* 46 — Every insight requires asking an analyst and waiting
- *Market signal:* RICE 0.5831, 1 mentions, 1 videos
- *Evidence:* Whether you're looking to optimize order fulfillment or improve customer satisfaction, this video provides essential insights on using Backorder Processing in SAP (AATP).
- *Expected:* Tier-1 market signal (RICE 0.6, 1 mentions / 1 videos). Maps to Nexova pain #46. Use tools: copilot_chat, run_scenario, get_audit_trail. Monitor KPIs: ** ATP. Evidence: Whether you're looking to optimize order fulfillment or improve customer satisfaction, this video provides essential insights on using Backorder Processing in …

**T1-4.** How does Nexova Copilot address: Every insight requires asking an analyst and waiting?
- *Pain #:* 46 — Every insight requires asking an analyst and waiting
- *Market signal:* RICE 0.4708, 1 mentions, 1 videos
- *Evidence:* Brasca shares his perspective on how AI and agentic frameworks will transform the role of supply chain planners, freeing them from manual data analysis and enabling them to focus on strategic decisio…
- *Expected:* Tier-1 market signal (RICE 0.5, 1 mentions / 1 videos). Maps to Nexova pain #46. Use tools: copilot_chat, run_scenario, get_audit_trail. Monitor KPIs: service level, cost. Evidence: Brasca shares his perspective on how AI and agentic frameworks will transform the role of supply chain planners, freeing them from manual data analysis and ena…

**T1-5.** How does Nexova Copilot address: No audit trail of who decided what, when, and why?
- *Pain #:* 50 — No audit trail of who decided what, when, and why
- *Market signal:* RICE 0.3805, 1 mentions, 1 videos
- *Evidence:* And the third one is find a way to have audit third one is find a way to have audit third one is find a way to have audit traceability.
- *Expected:* Tier-1 market signal (RICE 0.4, 1 mentions / 1 videos). Maps to Nexova pain #50. Use tools: copilot_chat, run_scenario, get_audit_trail. Monitor KPIs: service level, cost. Evidence: And the third one is find a way to have audit third one is find a way to have audit third one is find a way to have audit traceability.

### Build-pack pains (seed until intel validates)

**Pack #39.** How should we handle: Leadership asks where's my order and it takes hours to answer?
- *Expected:* Answer from Nexova Copilot playbook (pain #39). Use copilot_chat, run_scenario, get_audit_trail. Cite KB SOP if uploaded.

**Pack #48.** How should we handle: Scenario questions (what if demand +10%) take a week to answer?
- *Expected:* Answer from Nexova Copilot playbook (pain #48). Use copilot_chat, run_scenario, get_audit_trail. Cite KB SOP if uploaded.

---

## M6 — Control Tower

**Nexova pains covered:** #38, #40, #43, #49
**Copilot tools:** `get_control_tower_kpis, list_exceptions, resolve_exception`
**Tier 1 clusters mapped:** 23

### Canonical seed questions (always ship with module)

**Q1.** What needs my attention on the control tower right now?
- *Expected:* Return exception queue sorted by severity: OTIF risk, stockout, near-expiry, freight variance, forecast breach.

**Q2.** Show OTIF and fill rate by customer for the last 30 days.
- *Expected:* Aggregate Deliver KPIs with drill-down to late orders and disputed lines.

**Q3.** Which KPIs deteriorated vs last month and what changed?
- *Expected:* Compare 20 core KPIs period-over-period with driver decomposition (demand, supply, logistics).

### Tier 1 intel cluster Q&As

**T1-1.** How does Nexova Control Tower address: OTIF disputes with customers — no shared single truth?
- *Pain #:* 43 — OTIF disputes with customers — no shared single truth
- *Market signal:* RICE 5.274, 3 mentions, 3 videos
- *Evidence:* Implementation of OMP Implementation of OMP Implementation of OMP and providing end-to-end visibility has and providing end-to-end visibility has and providing end-to-end visibility has changed our d…
- *Expected:* Tier-1 market signal (RICE 5.3, 3 mentions / 3 videos). Maps to Nexova pain #43. Use tools: get_control_tower_kpis, list_exceptions, resolve_exception. Monitor KPIs: ** OTIF, service level. Evidence: Implementation of OMP Implementation of OMP Implementation of OMP and providing end-to-end visibility has and providing end-to-end visibility has and providing…

**T1-2.** How does Nexova Control Tower address: No control tower — status lives in 14 spreadsheets and 6 systems?
- *Pain #:* 38 — No control tower — status lives in 14 spreadsheets and 6 systems
- *Market signal:* RICE 0.9678, 1 mentions, 1 videos
- *Evidence:* It'd be great to kind of ask yourselves kind of great to kind of ask yourselves kind of great to kind of ask yourselves kind of how can AI and end to-end visibility how can AI and end to-end visibili…
- *Expected:* Tier-1 market signal (RICE 1.0, 1 mentions / 1 videos). Maps to Nexova pain #38. Use tools: get_control_tower_kpis, list_exceptions, resolve_exception. Monitor KPIs: service level, cost. Evidence: It'd be great to kind of ask yourselves kind of great to kind of ask yourselves kind of great to kind of ask yourselves kind of how can AI and end to-end visib…

**T1-3.** How does Nexova Control Tower address: No control tower — status lives in 14 spreadsheets and 6 systems?
- *Pain #:* 38 — No control tower — status lives in 14 spreadsheets and 6 systems
- *Market signal:* RICE 0.9415, 1 mentions, 1 videos
- *Evidence:* Why do number one organizations rely they cling to spreadsheets number rely they cling to spreadsheets number rely they cling to spreadsheets number one, and number two, they often times one, and num…
- *Expected:* Tier-1 market signal (RICE 0.9, 1 mentions / 1 videos). Maps to Nexova pain #38. Use tools: get_control_tower_kpis, list_exceptions, resolve_exception. Monitor KPIs: ** lead time. Evidence: Why do number one organizations rely they cling to spreadsheets number rely they cling to spreadsheets number rely they cling to spreadsheets number one, and n…

**T1-4.** How does Nexova Control Tower address: No control tower — status lives in 14 spreadsheets and 6 systems?
- *Pain #:* 38 — No control tower — status lives in 14 spreadsheets and 6 systems
- *Market signal:* RICE 0.8436, 1 mentions, 1 videos
- *Evidence:* Tada Supply Chain Control Tower Demo Video Tada bottles 25 years of experience solving complex supply chain problems to bring you a powerful solution, Supply Chain Control Tower.
- *Expected:* Tier-1 market signal (RICE 0.8, 1 mentions / 1 videos). Maps to Nexova pain #38. Use tools: get_control_tower_kpis, list_exceptions, resolve_exception. Monitor KPIs: service level, cost. Evidence: Tada Supply Chain Control Tower Demo Video Tada bottles 25 years of experience solving complex supply chain problems to bring you a powerful solution, Supply C…

**T1-5.** How does Nexova Control Tower address: No control tower — status lives in 14 spreadsheets and 6 systems?
- *Pain #:* 38 — No control tower — status lives in 14 spreadsheets and 6 systems
- *Market signal:* RICE 0.8436, 1 mentions, 1 videos
- *Evidence:* See how Planners, Buyers, Suppliers and Executives can use Tada's Supply Chain Control Tower to gain orchestration, collaboration and end-to-end visibility across their entire supply chain ecosystem.
- *Expected:* Tier-1 market signal (RICE 0.8, 1 mentions / 1 videos). Maps to Nexova pain #38. Use tools: get_control_tower_kpis, list_exceptions, resolve_exception. Monitor KPIs: service level, cost. Evidence: See how Planners, Buyers, Suppliers and Executives can use Tada's Supply Chain Control Tower to gain orchestration, collaboration and end-to-end visibility acr…

### Build-pack pains (seed until intel validates)

**Pack #40.** How should we handle: KPIs assembled manually each month, already stale?
- *Expected:* Answer from Nexova Control Tower playbook (pain #40). Use get_control_tower_kpis, list_exceptions, resolve_exception. Cite KB SOP if uploaded.

**Pack #49.** How should we handle: Reports don't lead to decisions — dashboards without actions?
- *Expected:* Answer from Nexova Control Tower playbook (pain #49). Use get_control_tower_kpis, list_exceptions, resolve_exception. Cite KB SOP if uploaded.

---

## M7 — Knowledge Base

**Nexova pains covered:** #44, #45
**Copilot tools:** `search_knowledge_base, upload_document, cite_policy`
**Tier 1 clusters mapped:** 0

### Canonical seed questions (always ship with module)

**Q1.** What is our SOP for near-expiry inventory in pharma?
- *Expected:* Retrieve top KB chunks from uploaded SOPs; answer with citations and escalation path.

**Q2.** What policy governs allocation during a shortage?
- *Expected:* Search knowledge base for allocation rules; return ranked customers/SKU rules with doc references.

**Q3.** Summarize tribal knowledge we captured about lot continuity for key accounts.
- *Expected:* Surface KB articles tagged lot-continuity; list account-specific constraints planners must follow.

### Build-pack pains (seed until intel validates)

**Pack #44.** How should we handle: Tribal knowledge — when the senior planner quits, the logic leaves?
- *Expected:* Answer from Nexova Knowledge Base playbook (pain #44). Use search_knowledge_base, upload_document, cite_policy. Cite KB SOP if uploaded.

**Pack #45.** How should we handle: SOPs exist but nobody reads them; answers take days?
- *Expected:* Answer from Nexova Knowledge Base playbook (pain #45). Use search_knowledge_base, upload_document, cite_policy. Cite KB SOP if uploaded.

---

## M8 — Billing

**Nexova pains covered:** platform
**Copilot tools:** `get_subscription, list_invoices, check_usage_limits`
**Tier 1 clusters mapped:** 0

### Canonical seed questions (always ship with module)

**Q1.** What plan are we on and how many SKUs/users remain in our tier limit?
- *Expected:* Read subscription tier, usage counters, and renewal date from billing service.

**Q2.** Show our last three invoices and payment status.
- *Expected:* List Razorpay invoices with GST breakdown and download links.

**Q3.** Will importing 2,000 more SKUs exceed our Starter plan?
- *Expected:* Check projected SKU count against tier cap; recommend upgrade if blocked.

---

## M9 — Admin

**Nexova pains covered:** platform
**Copilot tools:** `invite_user, assign_role, list_org_members`
**Tier 1 clusters mapped:** 0

### Canonical seed questions (always ship with module)

**Q1.** Who has Planner access in our org and what did they change this week?
- *Expected:* List members by role with recent audit events tied to their user ID.

**Q2.** Invite a new logistics manager with view-only dispatch access.
- *Expected:* Start invite flow with role=Logistics; confirm email and permissions before send.

**Q3.** Is our tenant data isolated from other organizations?
- *Expected:* Explain RLS policy: all queries scoped by org_id; offer test query proof for admins.

---
