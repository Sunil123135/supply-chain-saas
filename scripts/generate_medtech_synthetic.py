#!/usr/bin/env python3
"""
Generate Yugam MedTech starter-pack synthetic data.

Inspired by public industry taxonomies (capital equipment, implants, disposables,
spare parts, robotics) — all SKUs are FICTIONAL (YGM-* prefix).
Do not treat as real manufacturer catalogs.
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 42
OUT = Path(__file__).resolve().parent.parent / "data" / "medtech-starter-pack"

# (category, subcategory, count, unit_cost_range, weight_kg_range, shelf_life_days|None, lot_tracked)
CATALOG_TEMPLATE: list[tuple[str, str, int, tuple[int, int], tuple[float, float], int | None, bool]] = [
    ("capital_equipment", "surgical_robot", 4, (800_000, 2_500_000), (180, 450), None, True),
    ("capital_equipment", "imaging_system", 3, (400_000, 1_200_000), (250, 600), None, True),
    ("capital_equipment", "patient_monitor", 5, (15_000, 85_000), (8, 25), None, True),
    ("capital_equipment", "lab_analyzer", 4, (120_000, 450_000), (90, 200), None, True),
    ("implant", "knee_system", 8, (8_000, 35_000), (0.5, 2.5), None, True),
    ("implant", "hip_system", 6, (10_000, 42_000), (0.6, 3.0), None, True),
    ("implant", "spine_implant", 10, (3_500, 28_000), (0.2, 1.8), None, True),
    ("implant", "trauma_plate", 8, (2_000, 15_000), (0.1, 0.9), None, True),
    ("implant", "cardiovascular", 6, (5_000, 45_000), (0.05, 0.4), 730, True),
    ("disposable", "surgical_instrument", 12, (80, 1_200), (0.02, 0.5), 1095, True),
    ("disposable", "surgical_drape_kit", 6, (25, 180), (0.1, 0.8), 730, True),
    ("disposable", "infusion_set", 8, (15, 95), (0.05, 0.2), 730, True),
    ("disposable", "wound_closure", 6, (40, 350), (0.01, 0.15), 1095, True),
    ("spare_part", "robot_component", 10, (2_500, 45_000), (0.5, 12), None, True),
    ("spare_part", "sensor_module", 8, (800, 8_500), (0.1, 2), None, True),
    ("spare_part", "service_kit", 6, (500, 6_000), (0.2, 5), 365, True),
    ("consumable", "surgical_staple", 6, (120, 900), (0.02, 0.1), 1095, True),
    ("consumable", "energy_device_tip", 5, (200, 2_500), (0.05, 0.3), 730, True),
    ("diagnostic", "ivd_reagent", 8, (60, 450), (0.1, 1.5), 180, True),
    ("diagnostic", "calibrator_control", 4, (90, 600), (0.05, 0.5), 90, True),
]

NODES = [
    ("PLT-PUNE", "plant", "Pune", "411057"),
    ("DC-MUM", "dc", "Mumbai", "400079"),
    ("WH-DEL", "warehouse", "Delhi", "110020"),
    ("WH-BLR", "warehouse", "Bengaluru", "560100"),
    ("SVC-CHN", "service_center", "Chennai", "600032"),
]

CUSTOMERS = [
    ("HOSP-001", "A", "Metro General Hospital", "Mumbai"),
    ("HOSP-002", "A", "Apollo Care Institute", "Delhi"),
    ("ASC-003", "B", "Sunrise Ambulatory Surgery", "Pune"),
    ("HOSP-004", "B", "Lakeview Medical Center", "Bengaluru"),
    ("HOSP-005", "C", "District Health Network", "Chennai"),
    ("DEAL-006", "B", "MedSupply Distributors", "Hyderabad"),
]

SUBCAT_LABELS: dict[str, list[str]] = {
    "surgical_robot": ["Articulated Arm Platform", "Navigation Console", "Haptic Controller Unit"],
    "imaging_system": ["Mobile C-Arm", "Digital Radiography Suite", "Ultrasound Cart"],
    "patient_monitor": ["Bedside Monitor", "Vital Signs Module", "Telemetry Hub"],
    "lab_analyzer": ["Immunoassay Analyzer", "Hematology System", "POC Diagnostic Hub"],
    "knee_system": ["Femoral Component", "Tibial Insert", "Patella Button"],
    "hip_system": ["Acetabular Shell", "Femoral Stem", "Ceramic Head"],
    "spine_implant": ["Pedicle Screw", "Interbody Cage", "Rod Connector"],
    "trauma_plate": ["Locking Plate", "Intramedullary Nail", "Cannulated Screw"],
    "cardiovascular": ["Drug-Eluting Stent", "Guidewire", "EP Ablation Catheter"],
    "surgical_instrument": ["Laparoscopic Grasper", "Retractor Set", "Bone Saw Blade"],
    "surgical_drape_kit": ["Orthopedic Drape Pack", "Cardiac Procedure Kit"],
    "infusion_set": ["IV Administration Set", "Extension Line"],
    "wound_closure": ["Suture Pack", "Skin Staple Cartridge"],
    "robot_component": ["Optical Tracker", "Motor Drive Assembly", "Control PCB"],
    "sensor_module": ["Force Torque Sensor", "Encoders Pack", "Camera Module"],
    "service_kit": ["Preventive Maintenance Kit", "Calibration Kit"],
    "surgical_staple": ["Linear Stapler Reload", "Circular Stapler Cartridge"],
    "energy_device_tip": ["Electrosurgical Tip", "Ultrasonic Handpiece"],
    "ivd_reagent": ["Assay Reagent Kit", "Wash Buffer"],
    "calibrator_control": ["Level 1 Control", "Level 2 Control"],
}


def write_csv(path: Path, headers: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)


def main() -> None:
    random.seed(SEED)
    today = date(2026, 7, 4)

    skus: list[list] = []
    sku_seq = 1
    for category, subcat, count, cost_rng, wt_rng, shelf, lot in CATALOG_TEMPLATE:
        labels = SUBCAT_LABELS.get(subcat, [subcat.replace("_", " ").title()])
        for i in range(count):
            sku_id = f"YGM-{category[:3].upper()}-{sku_seq:04d}"
            name = f"Yugam {random.choice(labels)} {subcat.replace('_', ' ').title()} v{i + 1}"
            unit_cost = round(random.uniform(*cost_rng), 2)
            weight = round(random.uniform(*wt_rng), 3)
            volume = round(weight * random.uniform(0.001, 0.004), 4)
            lead = random.choice([7, 14, 21, 28, 45, 60, 90, 120])
            moq = random.choice([1, 1, 1, 2, 5, 10, 25])
            abc = random.choices(["A", "B", "C"], weights=[0.2, 0.35, 0.45])[0]
            if category == "capital_equipment":
                abc = "A"
                lead = random.choice([60, 90, 120, 180])
                moq = 1
            skus.append(
                [
                    sku_id,
                    name,
                    category,
                    subcat,
                    "EA",
                    unit_cost,
                    weight,
                    volume,
                    lead,
                    moq,
                    abc,
                    "true" if lot else "false",
                    shelf if shelf else "",
                    "synthetic",
                ]
            )
            sku_seq += 1

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
    lot_skus = [s for s in skus if s[11] == "true" and s[2] in ("implant", "disposable", "consumable", "diagnostic", "spare_part")]
    for sku in lot_skus:
        n_lots = random.randint(1, 4)
        for _ in range(n_lots):
            lot_id = f"LOT-{lot_seq:06d}"
            mfg = today - timedelta(days=random.randint(30, 400))
            if sku[12]:
                expiry = mfg + timedelta(days=int(sku[12]))
            else:
                expiry = ""
            qty = random.randint(5, 500) if sku[2] != "spare_part" else random.randint(2, 40)
            node = random.choice(NODES)[0]
            lots.append(
                [
                    sku[0],
                    lot_id,
                    mfg.isoformat(),
                    expiry.isoformat() if expiry else "",
                    qty,
                    node,
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
    weeks = 104
    for sku in skus:
        base = random.uniform(2, 80)
        if sku[2] == "capital_equipment":
            base = random.uniform(0.05, 0.8)
        elif sku[10] == "A":
            base *= 1.8
        level = base
        for w in range(weeks):
            week_start = today - timedelta(weeks=weeks - w)
            level = max(0.1, level * random.uniform(0.85, 1.15))
            if random.random() < 0.08:
                level *= random.uniform(2.0, 4.0)
            qty = max(0, round(level + random.gauss(0, level * 0.15), 2))
            demand.append(
                [
                    sku[0],
                    week_start.isoformat(),
                    "hospital",
                    round(qty, 2),
                    "synthetic",
                ]
            )

    write_csv(
        OUT / "demand_history.csv",
        ["sku_id", "week_start", "channel", "qty", "data_provenance"],
        demand,
    )

    orders: list[list] = []
    for i in range(55):
        sku = random.choice(skus)
        cust = random.choice(CUSTOMERS)
        qty = random.randint(1, 50) if sku[2] != "capital_equipment" else 1
        ship_by = today + timedelta(days=random.randint(3, 21))
        orders.append(
            [
                f"ORD-{1000 + i}",
                cust[0],
                sku[0],
                qty,
                cust[1],
                ship_by.isoformat(),
                random.choice(["open", "open", "partial", "allocated"]),
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
        [
            "rule_id",
            "customer_tier",
            "sku_abc_class",
            "max_shortage_pct",
            "notes",
            "data_provenance",
        ],
        [
            ["RULE-01", "A", "A", 0, "Fulfill A customers fully for A SKUs", "synthetic"],
            ["RULE-02", "A", "B", 10, "Max 10% shortage for tier A on B SKUs", "synthetic"],
            ["RULE-03", "B", "A", 15, "Tier B may short 15% on A SKUs in constraint", "synthetic"],
            ["RULE-04", "C", "C", 40, "Tier C deprioritized for C SKUs", "synthetic"],
        ],
    )

    shipments: list[list] = []
    pincodes = ["411057", "400079", "110020", "560100", "600032", "500032", "700091"]
    for i in range(24):
        origin = random.choice(NODES)
        dest_pin = random.choice(pincodes)
        vehicle = f"MH-{random.randint(10, 99)}-{chr(random.randint(65, 90))}{chr(random.randint(65, 90))}-{random.randint(1000, 9999)}"
        status = random.choice(["planned", "loaded", "in_transit", "delivered"])
        fill = round(random.uniform(0.45, 0.95), 2)
        shipments.append(
            [
                f"SHP-{2000 + i}",
                vehicle,
                origin[0],
                dest_pin,
                random.choice(["14ft", "20ft", "32ft", "407"]),
                fill,
                status,
                (today - timedelta(days=random.randint(0, 5))).isoformat(),
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

    print(f"Generated {len(skus)} SKUs and starter pack at {OUT}")


if __name__ == "__main__":
    main()
