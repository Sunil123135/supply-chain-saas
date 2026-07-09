"""Load bundled CSV starter packs from repo data/."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

PACKS = {
    "medtech": "medtech-starter-pack",
    "cpg": "cpg-india-starter-pack",
}


def _data_root() -> Path:
    here = Path(__file__).resolve().parent.parent
    candidates = [here.parent / "data", here / "data"]
    for c in candidates:
        if (c / PACKS["medtech"]).exists():
            return c
    return candidates[0]


def read_csv(name: str, industry: str = "medtech") -> list[dict[str, str]]:
    path = _data_root() / PACKS.get(industry, PACKS["medtech"]) / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def load_pack(industry: str = "medtech") -> dict[str, Any]:
    return {
        "lots": read_csv("lots_inventory.csv", industry),
        "skus": read_csv("sku_master.csv", industry),
        "shipments": read_csv("shipments.csv", industry),
        "demand": read_csv("demand_history.csv", industry),
    }
