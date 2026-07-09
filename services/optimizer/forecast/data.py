"""Load demand time series from bundled CSV packs."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

PACKS = {"medtech": "medtech-starter-pack", "cpg": "cpg-india-starter-pack"}


def data_root() -> Path:
    optimizer_dir = Path(__file__).resolve().parent.parent
    for c in [optimizer_dir.parent.parent / "data", optimizer_dir / "data", Path("/app/data")]:
        if (c / PACKS["medtech"]).exists():
            return c
    return optimizer_dir.parent.parent / "data"


def load_demand_by_sku(industry: str = "medtech") -> dict[str, list[tuple[str, float]]]:
    path = data_root() / PACKS.get(industry, PACKS["medtech"]) / "demand_history.csv"
    by_sku: dict[str, list[tuple[str, float]]] = defaultdict(list)
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            sku = row.get("sku_id", "")
            week = row.get("week_start", "")
            try:
                qty = float(row.get("qty", 0) or 0)
            except ValueError:
                qty = 0.0
            if sku and week:
                by_sku[sku].append((week, qty))
    for sku in by_sku:
        by_sku[sku].sort(key=lambda x: x[0])
    return dict(by_sku)


def series_values(rows: list[tuple[str, float]]) -> tuple[list[str], list[float]]:
    weeks = [r[0] for r in rows]
    values = [r[1] for r in rows]
    return weeks, values
