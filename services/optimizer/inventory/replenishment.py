"""Auto-indent / replenishment — ROP breach → PO/STO proposals."""

from __future__ import annotations

from typing import Any

from inventory.meio import _stats_from_history, safety_stock


def auto_indent(
    skus: list[dict[str, Any]],
    demand_history: list[dict[str, Any]],
    on_hand: list[dict[str, Any]] | None = None,
    service_level: float = 0.95,
) -> dict[str, Any]:
    """
    Continuous threshold monitoring:
    if on_hand + on_order < ROP → generate indent for ROQ (rounded to MOQ).
    """
    by_sku: dict[str, list[float]] = {}
    for row in demand_history:
        sid = str(row.get("sku_id") or "")
        if sid:
            by_sku.setdefault(sid, []).append(float(row.get("qty") or 0))

    stock: dict[str, float] = {}
    for row in on_hand or []:
        sid = str(row.get("sku_id") or "")
        # lots_inventory style
        qty = float(row.get("qty_on_hand") or row.get("qty") or row.get("available_qty") or 0)
        stock[sid] = stock.get(sid, 0.0) + qty

    sku_meta = {str(s.get("sku_id")): s for s in skus}
    proposals: list[dict[str, Any]] = []

    for sku_id, hist in list(by_sku.items())[:80]:
        mean, std = _stats_from_history(hist[-26:])
        if mean <= 0:
            continue
        meta = sku_meta.get(sku_id, {})
        lead_weeks = float(meta.get("lead_time_days") or 14) / 7.0
        abc = str(meta.get("abc_class") or "B").upper()
        sl = 0.98 if abc == "A" else service_level
        ss = safety_stock(mean, std, lead_weeks, sl)
        rop = mean * lead_weeks + ss
        moq = max(1.0, float(meta.get("moq") or 1))
        # cover ~4 weeks + SS gap
        target = mean * 4 + ss
        oh = stock.get(sku_id, mean * 2)  # assume 2 weeks cover if no stock feed
        gap = rop - oh
        if gap <= 0:
            continue
        indent_qty = max(moq, target - oh)
        indent_qty = max(moq, round(indent_qty / moq) * moq)
        exposure = gap * float(meta.get("unit_cost") or meta.get("cost") or 100)
        proposals.append(
            {
                "sku_id": sku_id,
                "abc_class": abc,
                "on_hand": round(oh, 1),
                "rop": round(rop, 1),
                "gap": round(gap, 1),
                "indent_qty": indent_qty,
                "moq": moq,
                "lead_time_days": float(meta.get("lead_time_days") or 14),
                "doc_type": "STO" if abc == "A" else "PO",
                "priority": "critical" if gap > rop * 0.5 else "normal",
                "exposure_inr": round(exposure, 0),
            }
        )

    proposals.sort(key=lambda p: -p["exposure_inr"])
    return {
        "engine": "rop-auto-indent",
        "proposals": proposals,
        "summary": {
            "breaches": len(proposals),
            "critical": sum(1 for p in proposals if p["priority"] == "critical"),
            "totalIndentQty": sum(p["indent_qty"] for p in proposals),
            "exposureInr": round(sum(p["exposure_inr"] for p in proposals), 0),
        },
    }
