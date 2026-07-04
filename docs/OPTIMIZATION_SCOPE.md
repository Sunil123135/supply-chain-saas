# Yugam Optimization Scope

**Principle (locked):** All optimization **math** runs in the Python `services/optimizer` (and future `backend` optimizers). The LLM (Copilot) **explains, compares scenarios, and narrates** — never computes safety stock, routes, or MIP solutions.

Yugam is **not** forecast-only. The product solves the **top supply chain pain stack**:

| Layer | Problems solved | Methods |
|-------|-----------------|---------|
| **Planning** | Forecast accuracy, MAPE, silos, intermittent demand | Prophet, Croston/TSB, WAPE, promo flags |
| **Inventory** | Safety stock, E&O, FEFO, allocation | Stochastic SS, multi-echelon heuristics → MIP later |
| **Replenishment** | Auto-indent, plan vs actual | ROP/ROQ, exception queues |
| **Logistics** | Routing, fill rate, vehicle type, dispatch PVA | VRP (OR-Tools), distance matrices, load building |
| **Network** | **DC rationalization**, which sites to open/close | **Mixed-integer programming (MIP)** |
| **Warehouse** | Slotting, pick path, capacity | Heuristics → MIP / simulation P3+ |
| **Advanced ML** | Demand with asymmetric loss, tail risk | **Pinball / quantile loss**, Huber, custom pinball → not only RMSE |

---

## Phase map

| Phase | Optimizer capability | Pain # addressed |
|-------|---------------------|------------------|
| **P1** | Data import, MAPE, FEFO sort, simple ROP | #1, #6, #11, #38 |
| **P2** | Capacitated VRP, vehicle type from cube/weight | #23–26, #30, #31 |
| **P3** | **DC rationalization MIP** (fixed charge facility location) | #12, #13, network |
| **P3** | Warehouse slotting heuristic | fill rate, pick productivity |
| **P4** | Multi-echelon inventory approximation | #8–10, #12 |
| **P5** | 3D load building, FTL/LTL compare | #24–25, #27 |
| **P6** | **Quantile / pinball forecast** (asymmetric loss) | promo spikes, quick commerce |
| **P6** | Invoice audit, freight benchmark | #28 |

---

## DC rationalization (MIP) — yes, planned

**Problem:** Which distribution centers / CFAs to keep, add, or close to minimize cost + service penalty.

**Formulation (facility location / fixed-charge):**

- Binary variables: site open/close
- Continuous: flow from plant → DC → customer
- Constraints: demand satisfaction, capacity, max distance / service time
- Solver: **OR-Tools MIP** or **PuLP + CBC** in `services/optimizer`

**Inputs from import wizard:** `nodes.csv`, `demand_history.csv`, `sku_master.csv` (weight/volume), transport cost per lane.

**Output:** Recommended network, scenario compare in Copilot (“close WH-BLR saves ₹X, OTIF impact Y%”).

---

## Vehicle routing & India logistics — yes, planned

| Feature | P2 approach |
|---------|-------------|
| PIN → PIN distance | OSRM / Google Distance Matrix + India PIN master |
| Multi-drop VRP | OR-Tools `RoutingModel` |
| Vehicle type | Bin packing on weight + volume → 407 / 14ft / 20ft / 32ft |
| Fill rate | loaded volume / vehicle capacity |
| Live GPS | Telematics partner P3 — not govt plate lookup alone |

---

## Advanced loss functions (beyond RMSE)

For CPG promo spikes and MedTech intermittent demand, **RMSE alone is wrong** (over-penalizes under-forecast on stockouts).

| Loss | Use when | Yugam module |
|------|----------|--------------|
| **MAPE / WAPE** | Reporting, planner accountability | M1 dashboard |
| **Pinball / quantile** | Asymmetric cost (stockout > overstock) | M1 ML service |
| **Huber** | Robust to outliers | M1 optional |
| **Croston / TSB** | Intermittent demand | M1 rule engine |

Implementation: `services/optimizer` with **LightGBM** or **sklearn** quantile regression; metrics exposed to Copilot.

---

## What P1 ships today

- Starter packs: **MedTech** + **India CPG** synthetic data
- **Import wizard** (`/import`) — load packs or upload CSV
- Copilot over imported summary (browser session)
- Optimizer service: **health only** — math endpoints added P2+

---

## References (methods)

- OR-Tools VRP: Google OR-Tools routing
- Facility location MIP: classic uncapacitated/capacitated facility location
- Quantile forecast: pinball loss / Koenker quantile regression
