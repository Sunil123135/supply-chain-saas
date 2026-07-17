"""Production planning LP — meet demand at min cost under capacity."""

from __future__ import annotations

from typing import Any


def production_plan_lp(
    products: list[dict[str, Any]],
    weekly_capacity: float = 10000,
) -> dict[str, Any]:
    """
    products: [{sku_id, demand, unit_cost, hours_per_unit?}]
    Minimize Σ cost_i * x_i (+ slack penalty)
    s.t. x_i >= demand_i, Σ hours_i x_i <= capacity + slack
    """
    if not products:
        return {
            "engine": "production-lp",
            "status": "Empty",
            "plan": [],
            "summary": {"skus": 0, "totalCost": 0, "capacityUsedPct": 0, "slackHours": 0},
        }

    products = products[:40]

    try:
        from pulp import PULP_CBC_CMD, LpMinimize, LpProblem, LpStatus, LpVariable, lpSum

        prob = LpProblem("Production_Plan", LpMinimize)
        x = {
            str(p["sku_id"]): LpVariable(f"prod_{p['sku_id']}", lowBound=0) for p in products
        }
        slack = LpVariable("cap_slack", lowBound=0)
        prob += (
            lpSum(float(p.get("unit_cost") or 10) * x[str(p["sku_id"])] for p in products)
            + 1_000_000 * slack
        )
        for p in products:
            sid = str(p["sku_id"])
            prob += x[sid] >= float(p.get("demand") or 0)
        prob += (
            lpSum(float(p.get("hours_per_unit") or 0.1) * x[str(p["sku_id"])] for p in products)
            <= weekly_capacity + slack
        )
        prob.solve(PULP_CBC_CMD(msg=0, timeLimit=5))
        plan = []
        total_cost = 0.0
        hours_used = 0.0
        for p in products:
            sid = str(p["sku_id"])
            qty = x[sid].varValue or 0
            cost = qty * float(p.get("unit_cost") or 10)
            hrs = qty * float(p.get("hours_per_unit") or 0.1)
            total_cost += cost
            hours_used += hrs
            plan.append(
                {
                    "sku_id": sid,
                    "demand": float(p.get("demand") or 0),
                    "planned_qty": round(qty, 1),
                    "unit_cost": float(p.get("unit_cost") or 10),
                    "cost": round(cost, 0),
                    "hours": round(hrs, 2),
                }
            )
        return {
            "engine": "pulp-cbc-production-lp",
            "status": LpStatus[prob.status],
            "plan": plan,
            "summary": {
                "skus": len(plan),
                "totalCost": round(total_cost, 0),
                "capacityUsedPct": round(100.0 * hours_used / max(weekly_capacity, 1), 1),
                "slackHours": round(slack.varValue or 0, 2),
            },
        }
    except Exception:
        pass

    plan = []
    hours_used = 0.0
    total_cost = 0.0
    for p in sorted(products, key=lambda r: float(r.get("unit_cost") or 10)):
        qty = float(p.get("demand") or 0)
        hrs = qty * float(p.get("hours_per_unit") or 0.1)
        cost = qty * float(p.get("unit_cost") or 10)
        hours_used += hrs
        total_cost += cost
        plan.append(
            {
                "sku_id": str(p["sku_id"]),
                "demand": qty,
                "planned_qty": qty,
                "unit_cost": float(p.get("unit_cost") or 10),
                "cost": round(cost, 0),
                "hours": round(hrs, 2),
            }
        )
    return {
        "engine": "greedy-production",
        "status": "Heuristic",
        "plan": plan,
        "summary": {
            "skus": len(plan),
            "totalCost": round(total_cost, 0),
            "capacityUsedPct": round(100.0 * hours_used / max(weekly_capacity, 1), 1),
            "slackHours": round(max(0, hours_used - weekly_capacity), 2),
        },
    }
