"""Demand sensing — short-horizon signal overlay on statistical forecast."""

from __future__ import annotations

from typing import Any


def demand_sense(
    demand_history: list[dict[str, Any]],
    open_orders: list[dict[str, Any]] | None = None,
    horizon_weeks: int = 4,
    offtake_boost: float = 0.0,
) -> dict[str, Any]:
    """
    Blend recent offtake velocity + open order book into near-term forecast.

    Sense signal = 0.5 * recent_4w_avg + 0.3 * prior_4w_avg + 0.2 * open_order_rate
    Then adjust base forecast for next horizon weeks.
    """
    by_sku: dict[str, list[tuple[str, float]]] = {}
    for row in demand_history:
        sid = str(row.get("sku_id") or "")
        week = str(row.get("week_start") or "")
        if not sid:
            continue
        by_sku.setdefault(sid, []).append((week, float(row.get("qty") or 0)))

    open_by_sku: dict[str, float] = {}
    for o in open_orders or []:
        if str(o.get("status") or "").lower() not in ("open", "confirmed", ""):
            continue
        sid = str(o.get("sku_id") or "")
        open_by_sku[sid] = open_by_sku.get(sid, 0.0) + float(o.get("qty") or 0)

    sensed: list[dict[str, Any]] = []
    for sku_id, series in list(by_sku.items())[:60]:
        series = sorted(series, key=lambda x: x[0])
        vals = [v for _, v in series]
        if len(vals) < 4:
            continue
        recent = sum(vals[-4:]) / 4
        prior = sum(vals[-8:-4]) / max(len(vals[-8:-4]), 1) if len(vals) >= 8 else recent
        open_rate = open_by_sku.get(sku_id, 0.0) / max(horizon_weeks, 1)
        signal = 0.5 * recent + 0.3 * prior + 0.2 * open_rate
        signal *= 1.0 + offtake_boost
        base = recent
        delta_pct = ((signal - base) / base * 100.0) if base > 0 else 0.0
        weeks = []
        for i in range(horizon_weeks):
            # Mean-revert sensed signal toward base over horizon
            w = i / max(horizon_weeks - 1, 1)
            qty = signal * (1 - 0.35 * w) + base * (0.35 * w)
            weeks.append({"week_offset": i + 1, "sensed_qty": round(qty, 1)})
        sensed.append(
            {
                "sku_id": sku_id,
                "recent_4w_avg": round(recent, 1),
                "prior_4w_avg": round(prior, 1),
                "open_order_rate": round(open_rate, 1),
                "sense_signal": round(signal, 1),
                "delta_vs_base_pct": round(delta_pct, 1),
                "horizon": weeks,
                "action": "raise" if delta_pct > 8 else ("cut" if delta_pct < -8 else "hold"),
            }
        )

    sensed.sort(key=lambda r: -abs(r["delta_vs_base_pct"]))
    raises = sum(1 for s in sensed if s["action"] == "raise")
    cuts = sum(1 for s in sensed if s["action"] == "cut")

    return {
        "engine": "demand-sensing-blend",
        "horizon_weeks": horizon_weeks,
        "skus": sensed,
        "summary": {
            "skuCount": len(sensed),
            "raiseSignals": raises,
            "cutSignals": cuts,
            "holdSignals": len(sensed) - raises - cuts,
        },
    }
