"""3D extreme-point packing; OR-Tools CP-SAT optional for tiny instances."""

from __future__ import annotations

from typing import Any


VEHICLES = {
    "407": {"l": 2.8, "w": 1.7, "h": 1.8, "maxWeightKg": 2500, "vehicle_type": "407"},
    "14ft": {"l": 4.2, "w": 2.1, "h": 2.0, "maxWeightKg": 4000, "vehicle_type": "14ft"},
    "20ft": {"l": 5.9, "w": 2.35, "h": 2.3, "maxWeightKg": 7000, "vehicle_type": "20ft"},
    "32ft": {"l": 9.5, "w": 2.4, "h": 2.5, "maxWeightKg": 12000, "vehicle_type": "32ft"},
}


def _expand(boxes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for b in boxes:
        qty = max(1, min(int(b.get("qty") or 1), 40))
        for i in range(qty):
            out.append(
                {
                    "id": f"{b.get('id')}#{i + 1}" if qty > 1 else str(b.get("id")),
                    "l": float(b.get("l") or 0.3),
                    "w": float(b.get("w") or 0.3),
                    "h": float(b.get("h") or 0.3),
                    "weight_kg": float(b.get("weight_kg") or 5),
                }
            )
    out.sort(key=lambda x: -(x["l"] * x["w"] * x["h"]))
    return out


def _overlaps(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return not (
        a["x"] + a["l"] <= b["x"]
        or b["x"] + b["l"] <= a["x"]
        or a["y"] + a["w"] <= b["y"]
        or b["y"] + b["w"] <= a["y"]
        or a["z"] + a["h"] <= b["z"]
        or b["z"] + b["h"] <= a["z"]
    )


def pack_3d(boxes: list[dict[str, Any]], vehicle_type: str = "14ft", max_loads: int = 12) -> dict[str, Any]:
    container = VEHICLES.get(vehicle_type, VEHICLES["14ft"])
    remaining = _expand(boxes)
    loads: list[dict[str, Any]] = []
    unpacked: list[str] = []

    while remaining and len(loads) < max_loads:
        placed: list[dict[str, Any]] = []
        weight = 0.0
        candidates = [{"x": 0.0, "y": 0.0, "z": 0.0}]
        still: list[dict[str, Any]] = []

        for box in remaining:
            if weight + box["weight_kg"] > container["maxWeightKg"]:
                still.append(box)
                continue
            placed_one = None
            orients = [
                (box["l"], box["w"], box["h"]),
                (box["w"], box["l"], box["h"]),
                (box["l"], box["h"], box["w"]),
            ]
            for pt in candidates:
                for l, w, h in orients:
                    cand = {
                        "id": box["id"],
                        "x": pt["x"],
                        "y": pt["y"],
                        "z": pt["z"],
                        "l": l,
                        "w": w,
                        "h": h,
                        "weight_kg": box["weight_kg"],
                    }
                    if (
                        cand["x"] + l > container["l"] + 1e-9
                        or cand["y"] + w > container["w"] + 1e-9
                        or cand["z"] + h > container["h"] + 1e-9
                    ):
                        continue
                    if any(_overlaps(cand, p) for p in placed):
                        continue
                    placed_one = cand
                    break
                if placed_one:
                    break
            if not placed_one:
                still.append(box)
                continue
            placed.append(placed_one)
            weight += box["weight_kg"]
            candidates.extend(
                [
                    {"x": placed_one["x"] + placed_one["l"], "y": placed_one["y"], "z": placed_one["z"]},
                    {"x": placed_one["x"], "y": placed_one["y"] + placed_one["w"], "z": placed_one["z"]},
                    {"x": placed_one["x"], "y": placed_one["y"], "z": placed_one["z"] + placed_one["h"]},
                ]
            )

        if not placed:
            unpacked.extend([b["id"] for b in still + remaining])
            break

        used_vol = sum(p["l"] * p["w"] * p["h"] for p in placed)
        cap_vol = container["l"] * container["w"] * container["h"]
        fill_vol = round(100.0 * used_vol / cap_vol, 1)
        fill_wt = round(100.0 * weight / container["maxWeightKg"], 1)
        loads.append(
            {
                "load_id": f"3D-{len(loads) + 1:03d}",
                "vehicle_type": container["vehicle_type"],
                "placements": placed,
                "used_volume_m3": round(used_vol, 3),
                "used_weight_kg": round(weight, 1),
                "fill_volume_pct": fill_vol,
                "fill_weight_pct": fill_wt,
                "fill_pct": max(fill_vol, fill_wt),
            }
        )
        remaining = still

    if remaining and len(loads) >= max_loads:
        unpacked.extend(b["id"] for b in remaining)

    avg = round(sum(l["fill_pct"] for l in loads) / len(loads), 1) if loads else 0
    return {
        "engine": "extreme-point-3d",
        "capacity": container,
        "loads": loads,
        "unpacked": list(dict.fromkeys(unpacked)),
        "summary": {
            "loads": len(loads),
            "avgFillPct": avg,
            "boxesPacked": sum(len(l["placements"]) for l in loads),
            "boxesUnpacked": len(unpacked),
        },
    }
