"""FEFO inventory math — Python mirror of apps/web/src/lib/math/fefo.ts"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any


def _num(v: Any) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def compute_fefo_queue(
    lots: list[dict[str, str]],
    horizon_days: int = 60,
    unit_cost_by_sku: dict[str, float] | None = None,
) -> dict[str, Any]:
    unit_cost_by_sku = unit_cost_by_sku or {}
    today = date.today()
    queue: list[dict[str, Any]] = []

    for lot in lots:
        qty = _num(lot.get("qty"))
        exp_raw = (lot.get("expiry_date") or "").strip()
        sku = lot.get("sku_id", "")
        priority = "none"
        action = "Monitor — no expiry tracked"
        days: int | None = None

        if exp_raw:
            exp = datetime.strptime(exp_raw[:10], "%Y-%m-%d").date()
            days = (exp - today).days
            if days < 0:
                priority, action = "critical", "Quarantine / write-off review"
            elif days <= 14:
                priority, action = "critical", "FEFO pick + markdown / alternate channel"
            elif days <= 30:
                priority, action = "high", "Reposition to high-velocity node"
            elif days <= horizon_days:
                priority, action = "medium", "Include in replenishment FEFO sort"
            else:
                priority, action = "low", "Standard rotation"

        if priority in ("none", "low"):
            continue

        unit = _num(lot.get("unit_cost_inr")) or unit_cost_by_sku.get(sku, 100)
        queue.append(
            {
                "sku_id": sku,
                "lot_id": lot.get("lot_id"),
                "node_id": lot.get("node_id", "—"),
                "qty": qty,
                "expiry_date": exp_raw or None,
                "days_to_expiry": days,
                "priority": priority,
                "action": action,
                "exposure_inr": round(qty * unit),
            }
        )

    order = {"critical": 0, "high": 1, "medium": 2}
    queue.sort(key=lambda x: (order.get(x["priority"], 9), x["days_to_expiry"] or 9999))
    exposure = sum(i["exposure_inr"] for i in queue)

    return {
        "queue": queue,
        "summary": {
            "totalLots": len(lots),
            "critical": sum(1 for q in queue if q["priority"] == "critical"),
            "high": sum(1 for q in queue if q["priority"] == "high"),
            "exposureInr": exposure,
            "horizonDays": horizon_days,
        },
    }
