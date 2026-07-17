"""Multi-echelon inventory + newsvendor (critical-fractile) math.

Implements Enmovil-parity MEIO approximations:
- Per-SKU safety stock from demand variability × lead-time √
- Multi-echelon square-root pooling across plant → DC → CFA
- Newsvendor Q* for perishable / expiry-sensitive SKUs
"""

from __future__ import annotations

import math
from typing import Any

# Approximate Z for common service levels (normal)
_Z = {
    0.90: 1.282,
    0.95: 1.645,
    0.97: 1.881,
    0.98: 2.054,
    0.99: 2.326,
}


def _z(service_level: float) -> float:
    keys = sorted(_Z)
    closest = min(keys, key=lambda k: abs(k - service_level))
    return _Z[closest]


def safety_stock(
    demand_mean_weekly: float,
    demand_std_weekly: float,
    lead_time_weeks: float,
    service_level: float = 0.95,
) -> float:
    """SS = Z × σ_d × √L  (weekly demand units)."""
    if demand_mean_weekly <= 0 and demand_std_weekly <= 0:
        return 0.0
    sigma = max(demand_std_weekly, demand_mean_weekly * 0.15)
    return _z(service_level) * sigma * math.sqrt(max(lead_time_weeks, 0.1))


def newsvendor_qty(
    demand_mean: float,
    demand_std: float,
    underage_cost: float,
    overage_cost: float,
) -> dict[str, float]:
    """Classic newsvendor: P(D ≤ Q*) = Cu / (Cu + Co)."""
    cu = max(underage_cost, 1e-6)
    co = max(overage_cost, 1e-6)
    critical = cu / (cu + co)
    # Inverse normal approx via Z table interpolation
    z = _z(min(0.99, max(0.5, critical)))
    # For critical < 0.5 use negative z
    if critical < 0.5:
        z = -_z(1.0 - critical)
    q = max(0.0, demand_mean + z * max(demand_std, demand_mean * 0.1))
    return {
        "critical_fractile": round(critical, 4),
        "z": round(z, 3),
        "q_star": round(q, 1),
        "demand_mean": round(demand_mean, 1),
        "demand_std": round(demand_std, 1),
    }


def _stats_from_history(qty: list[float]) -> tuple[float, float]:
    if not qty:
        return 0.0, 0.0
    mean = sum(qty) / len(qty)
    if len(qty) < 2:
        return mean, mean * 0.2
    var = sum((x - mean) ** 2 for x in qty) / (len(qty) - 1)
    return mean, math.sqrt(var)


def meio_optimize(
    skus: list[dict[str, Any]],
    demand_history: list[dict[str, Any]],
    nodes: list[dict[str, Any]] | None = None,
    service_level: float = 0.95,
    holding_rate: float = 0.25,
) -> dict[str, Any]:
    """
    Multi-echelon approximation:
    - Compute per-SKU SS at leaf (CFA/DC)
    - Square-root pooling reduces system SS vs sum of independent echelons
    - Recommend ROP = μ×L + SS, ROQ ≈ EOQ-ish from mean demand
    """
    by_sku: dict[str, list[float]] = {}
    for row in demand_history:
        sid = str(row.get("sku_id") or "")
        if not sid:
            continue
        by_sku.setdefault(sid, []).append(float(row.get("qty") or 0))

    echelons = 1
    if nodes:
        types = {str(n.get("node_type") or "").lower() for n in nodes}
        echelons = max(1, sum(1 for t in ("plant", "dc", "wh", "cfa", "distributor") if any(t in x for x in types)))

    # Square-root law: system SS ≈ SS_leaf × √echelons / echelons for pooled stock
    pool_factor = math.sqrt(echelons) / echelons if echelons > 1 else 1.0

    results: list[dict[str, Any]] = []
    total_ss_value = 0.0
    total_independent = 0.0

    sku_meta = {str(s.get("sku_id")): s for s in skus}

    for sku_id, hist in list(by_sku.items())[:80]:
        mean, std = _stats_from_history(hist[-26:])
        meta = sku_meta.get(sku_id, {})
        lead_days = float(meta.get("lead_time_days") or 14)
        lead_weeks = lead_days / 7.0
        unit_cost = float(meta.get("unit_cost") or meta.get("cost") or 100)
        abc = str(meta.get("abc_class") or "B").upper()
        sl = 0.98 if abc == "A" else (0.95 if abc == "B" else min(service_level, 0.90))

        ss_leaf = safety_stock(mean, std, lead_weeks, sl)
        ss_system = ss_leaf * pool_factor * echelons  # redeployed across echelons
        ss_independent = ss_leaf * echelons
        rop = mean * lead_weeks + ss_leaf
        # EOQ-ish: √(2 D S / H) with S≈ order cost 500, H = holding_rate * unit_cost
        annual_d = mean * 52
        h = max(holding_rate * unit_cost, 1.0)
        roq = math.sqrt(max(2 * annual_d * 500 / h, 1.0))
        moq = float(meta.get("moq") or 1)
        roq = max(moq, math.ceil(roq / moq) * moq)

        # Newsvendor for near-expiry / regulated SKUs
        is_perishable = bool(meta.get("shelf_life_days")) or abc == "A"
        nv = None
        if is_perishable:
            # underage = margin ~ 0.4*cost, overage = holding + expiry risk
            nv = newsvendor_qty(mean * 4, std * 2, underage_cost=0.4 * unit_cost, overage_cost=0.6 * unit_cost)

        ss_value = ss_system * unit_cost
        total_ss_value += ss_value
        total_independent += ss_independent * unit_cost

        results.append(
            {
                "sku_id": sku_id,
                "abc_class": abc,
                "demand_mean_weekly": round(mean, 2),
                "demand_std_weekly": round(std, 2),
                "lead_time_weeks": round(lead_weeks, 2),
                "service_level": sl,
                "safety_stock_leaf": round(ss_leaf, 1),
                "safety_stock_system": round(ss_system, 1),
                "safety_stock_independent": round(ss_independent, 1),
                "rop": round(rop, 1),
                "roq": round(roq, 1),
                "unit_cost": unit_cost,
                "ss_inventory_value_inr": round(ss_value, 0),
                "newsvendor": nv,
            }
        )

    results.sort(key=lambda r: -r["ss_inventory_value_inr"])
    savings = max(0.0, total_independent - total_ss_value)

    return {
        "engine": "meio-sqrt-pooling+newsvendor",
        "echelons": echelons,
        "pool_factor": round(pool_factor, 4),
        "skus": results,
        "summary": {
            "skuCount": len(results),
            "systemSsValueInr": round(total_ss_value, 0),
            "independentSsValueInr": round(total_independent, 0),
            "poolingSavingsInr": round(savings, 0),
            "savingsPct": round(100.0 * savings / total_independent, 1) if total_independent else 0,
        },
    }
