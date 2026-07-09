"""Freight settlement audit — Python mirror of apps/web/src/lib/math/freight.ts"""

from __future__ import annotations

from typing import Any

BASE_RATES = {"14ft": 18500, "32ft": 42000, "407": 28000, "truck": 35000}


def _num(v: Any) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _lane_key(origin: str, dest: str) -> str:
    return f"{origin or 'UNK'}→{(dest or '')[:3]}"


def _contract_rate(vehicle: str, fill: float) -> int:
    base = BASE_RATES.get(vehicle, BASE_RATES["truck"])
    util = 1.05 if fill < 0.6 else 1.0
    return round(base * 1.08 * util)


def build_invoices(shipments: list[dict[str, str]]) -> list[dict[str, Any]]:
    invoices: list[dict[str, Any]] = []
    for i, s in enumerate(shipments):
        vt = s.get("vehicle_type") or "truck"
        fill = _num(s.get("fill_rate_pct"))
        contract = _contract_rate(vt, fill)
        factor = 1.12 if i % 4 == 0 else (1.06 if i % 7 == 0 else 1.0)
        accessorial = 2500 if i % 5 == 0 else 0
        billed = round(contract * factor + accessorial)
        variance = billed - contract
        flags: list[str] = []
        if factor > 1:
            flags.append("Rate above contract band")
        if accessorial:
            flags.append("Uncontracted accessorial")
        if fill < 0.55:
            flags.append("Low fill — detention risk")
        status = "overbill" if variance > 500 else ("underbill" if variance < -100 else "match")
        invoices.append(
            {
                "invoice_id": f"INV-{s.get('shipment_id')}",
                "shipment_id": s.get("shipment_id"),
                "carrier_name": f"Carrier-{(i % 3) + 1}",
                "lane_key": _lane_key(s.get("origin_node_id", ""), s.get("dest_pincode", "")),
                "vehicle_type": vt,
                "contract_inr": contract,
                "billed_inr": billed,
                "variance_inr": variance,
                "variance_pct": round((variance / contract * 100) if contract else 0, 1),
                "audit_status": status,
                "flags": flags,
            }
        )
    return invoices


def audit_invoices(invoices: list[dict[str, Any]]) -> dict[str, Any]:
    disputes = [i for i in invoices if i["audit_status"] == "overbill"]
    recoverable = sum(max(0, i["variance_inr"]) for i in disputes)
    billed_total = sum(i["billed_inr"] for i in invoices) or 1
    return {
        "totalInvoices": len(invoices),
        "matches": sum(1 for i in invoices if i["audit_status"] == "match"),
        "overbilled": len(disputes),
        "recoverableInr": recoverable,
        "disputes": sorted(disputes, key=lambda x: -x["variance_inr"]),
        "leakagePct": round(recoverable / billed_total * 100, 1),
    }
