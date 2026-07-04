#!/usr/bin/env python3
"""
Generate Yugam India CPG/FMCG starter-pack synthetic data.

Inspired by public India FMCG distribution structure (manufacturer → CFA →
distributor → retailer). Brand *categories* reflect portfolios of major Indian
FMCG players (HUL, ITC, Nestlé India, Britannia, Dabur, Marico, etc.) but all
SKUs are FICTIONAL (YGC-* prefix).
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 2026
OUT = Path(__file__).resolve().parent.parent / "data" / "cpg-india-starter-pack"


def write_csv(path: Path, headers: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)


CATALOG: list[tuple[str, str, int, tuple[int, int], tuple[float, float], int | None]] = [
    ("personal_care", "soap", 8, (25, 120), (0.08, 0.25), 730),
    ("personal_care", "shampoo", 8, (80, 350), (0.15, 0.5), 730),
    ("personal_care", "skin_cream", 6, (60, 280), (0.05, 0.2), 540),
    ("home_care", "detergent", 10, (90, 450), (0.5, 2.5), 1095),
    ("home_care", "dishwash", 6, (45, 180), (0.3, 1.0), 730),
    ("home_care", "surface_cleaner", 6, (55, 220), (0.4, 1.2), 730),
    ("foods", "biscuit", 12, (15, 80), (0.05, 0.35), 180),
    ("foods", "snacks", 10, (12, 60), (0.03, 0.2), 120),
    ("foods", "noodles", 6, (20, 55), (0.08, 0.25), 270),
    ("beverages", "soft_drink", 8, (25, 90), (0.5, 1.5), 180),
    ("beverages", "juice", 6, (40, 150), (0.3, 1.0), 120),
    ("beverages", "tea_coffee", 8, (120, 550), (0.1, 0.5), 365),
    ("staples", "atta_rice", 8, (50, 250), (1.0, 5.0), 270),
    ("staples", "cooking_oil", 6, (120, 450), (0.9, 3.0), 365),
    ("health", "ayurveda", 6, (80, 320), (0.1, 0.4), 540),
    ("oral_care", "toothpaste", 6, (45, 180), (0.08, 0.2), 730),
    ("baby_care", "diaper_wipes", 4, (150, 600), (0.2, 0.8), 730),
]

NODES = [
    ("PLT-HAR", "plant", "Haridwar", "249403"),
    ("CFA-WEST", "cfa", "Mumbai", "400079"),
    ("CFA-NORTH", "cfa", "Delhi", "110020"),
    ("CFA-SOUTH", "cfa", "Bengaluru", "560100"),
    ("DC-MUM", "dc", "Bhiwandi", "421302"),
    ("DC-DEL", "dc", "Gurgaon", "122001"),
]

CUSTOMERS = [
    ("DIST-001", "A", "West Super Stockist Mumbai", "Mumbai"),
    ("DIST-002", "A", "North CFA Delhi Hub", "Delhi"),
    ("DIST-003", "B", "South Regional Distributor", "Bengaluru"),
    ("DIST-004", "B", "Pune GT Distributor", "Pune"),
    ("DIST-005", "C", "Tier-3 Wholesaler UP", "Lucknow"),
    ("MT-006", "A", "Modern Trade National", "Mumbai"),
    ("QC-007", "A", "Quick Commerce Dark Store", "Delhi"),
]

LABELS: dict[str, list[str]] = {
    "soap": ["Beauty Bar", "Germ Shield Soap"],
    "shampoo": ["Anti-Dandruff", "Herbal Care"],
    "skin_cream": ["Moisturising Lotion", "Winter Care"],
    "detergent": ["Matic Liquid", "Power Wash Powder"],
    "dishwash": ["Lemon Fresh Gel", "Bar Pack"],
    "surface_cleaner": ["Floor Cleaner", "Kitchen Spray"],
    "biscuit": ["Marie", "Cream Cookie", "Digestive"],
    "snacks": ["Namkeen Mix", "Potato Crisps"],
    "noodles": ["Masala Instant", "Cup Noodles"],
    "soft_drink": ["Cola PET", "Lime Sparkling"],
    "juice": ["Mango Drink", "Mixed Fruit"],
    "tea_coffee": ["Leaf Tea", "Instant Coffee"],
    "atta_rice": ["Whole Wheat Atta", "Basmati Rice"],
    "cooking_oil": ["Sunflower Oil", "Blended Oil"],
    "ayurveda": ["Chyawanprash", "Honey Herbal"],
    "toothpaste": ["Cavity Guard", "Herbal Paste"],
    "diaper_wipes": ["Baby Diaper Pack", "Wipes Tub"],
}


def main() -> None:
    random.seed(SEED)
    today = date(2026, 7, 4)
    skus: list[list] = []
    seq = 1
    for category, subcat, count, cost_rng, wt_rng, shelf in CATALOG:
        for i in range(count):
            sku_id = f"YGC-{category[:3].upper()}-{seq:04d}"
            name = f"Yugam {random.choice(LABELS[subcat])} {subcat} {i + 1}"
            unit_cost = round(random.uniform(*cost_rng), 2)
            weight = round(random.uniform(*wt_rng), 3)
            volume = round(weight * random.uniform(0.001, 0.003), 4)
            lead = random.choice([3, 5, 7, 10, 14])
            moq = random.choice([24, 48, 72, 96, 144])
            abc = random.choices(["A", "B", "C"], weights=[0.25, 0.4, 0.35])[0]
            skus.append(
                [
                    sku_id,
                    name,
                    category,
                    subcat,
                    "CASE",
                    unit_cost,
                    weight,
                    volume,
                    lead,
                    moq,
                    abc,
                    "true",
                    shelf,
                    "synthetic",
                ]
            )
            seq += 1

    write_csv(
        OUT / "sku_master.csv",
        [
            "sku_id",
            "sku_name",
            "category",
            "subcategory",
            "uom",
            "unit_cost_inr",
            "weight_kg",
            "volume_m3",
            "lead_time_days",
            "moq",
            "abc_class",
            "lot_tracked",
            "shelf_life_days",
            "data_provenance",
        ],
        skus,
    )

    lots: list[list] = []
    lot_seq = 1
    for sku in skus:
        for _ in range(random.randint(2, 5)):
            mfg = today - timedelta(days=random.randint(5, 120))
            expiry = mfg + timedelta(days=int(sku[12]))
            lots.append(
                [
                    sku[0],
                    f"LOT-{lot_seq:06d}",
                    mfg.isoformat(),
                    expiry.isoformat(),
                    random.randint(50, 2000),
                    random.choice(NODES)[0],
                    "synthetic",
                ]
            )
            lot_seq += 1

    write_csv(
        OUT / "lots_inventory.csv",
        ["sku_id", "lot_id", "mfg_date", "expiry_date", "qty", "node_id", "data_provenance"],
        lots,
    )

    demand: list[list] = []
    channels = ["general_trade", "modern_trade", "quick_commerce", "horeca"]
    for sku in skus:
        base = random.uniform(100, 2000)
        if sku[10] == "A":
            base *= 2.5
        level = base
        for w in range(104):
            week_start = today - timedelta(weeks=104 - w)
            level = max(10, level * random.uniform(0.9, 1.1))
            if random.random() < 0.12:
                level *= random.uniform(1.8, 3.5)
            if sku[3] in ("biscuit", "snacks", "soft_drink") and w % 13 == 0:
                level *= random.uniform(1.5, 2.2)
            ch = random.choice(channels)
            demand.append([sku[0], week_start.isoformat(), ch, round(level, 2), "synthetic"])

    write_csv(
        OUT / "demand_history.csv",
        ["sku_id", "week_start", "channel", "qty", "data_provenance"],
        demand,
    )

    orders = []
    for i in range(60):
        sku = random.choice(skus)
        cust = random.choice(CUSTOMERS)
        orders.append(
            [
                f"ORD-{3000 + i}",
                cust[0],
                sku[0],
                random.randint(10, 500),
                cust[1],
                (today + timedelta(days=random.randint(1, 10))).isoformat(),
                random.choice(["open", "open", "partial"]),
                "synthetic",
            ]
        )

    write_csv(
        OUT / "open_orders.csv",
        ["order_id", "customer_id", "sku_id", "qty", "priority_tier", "ship_by_date", "status", "data_provenance"],
        orders,
    )

    write_csv(
        OUT / "allocation_rules.csv",
        ["rule_id", "customer_tier", "sku_abc_class", "max_shortage_pct", "notes", "data_provenance"],
        [
            ["RULE-01", "A", "A", 0, "MT/QC priority on A SKUs", "synthetic"],
            ["RULE-02", "A", "B", 5, "Super stockist min fill", "synthetic"],
            ["RULE-03", "B", "A", 12, "GT distributor shortage cap", "synthetic"],
            ["RULE-04", "C", "C", 35, "Wholesaler deprioritized", "synthetic"],
        ],
    )

    pincodes = ["400079", "411057", "110020", "560100", "600032", "700091", "226001", "302001"]
    shipments = []
    for i in range(30):
        origin = random.choice(NODES)
        shipments.append(
            [
                f"SHP-{4000 + i}",
                f"MH-{random.randint(10, 99)}-{chr(random.randint(65, 90))}{chr(random.randint(65, 90))}-{random.randint(1000, 9999)}",
                origin[0],
                random.choice(pincodes),
                random.choice(["407", "14ft", "20ft", "32ft"]),
                round(random.uniform(0.55, 0.98), 2),
                random.choice(["planned", "loaded", "in_transit", "delivered"]),
                (today - timedelta(days=random.randint(0, 4))).isoformat(),
                "",
                "synthetic",
            ]
        )

    write_csv(
        OUT / "shipments.csv",
        [
            "shipment_id",
            "vehicle_number",
            "origin_node_id",
            "dest_pincode",
            "vehicle_type",
            "fill_rate_pct",
            "status",
            "dispatch_date",
            "eway_bill_number",
            "data_provenance",
        ],
        shipments,
    )

    write_csv(
        OUT / "customers.csv",
        ["customer_id", "tier", "name", "city", "data_provenance"],
        [[c[0], c[1], c[2], c[3], "synthetic"] for c in CUSTOMERS],
    )

    write_csv(
        OUT / "nodes.csv",
        ["node_id", "node_type", "city", "pincode", "data_provenance"],
        [[n[0], n[1], n[2], n[3], "synthetic"] for n in NODES],
    )

    print(f"Generated {len(skus)} CPG SKUs at {OUT}")


if __name__ == "__main__":
    main()
