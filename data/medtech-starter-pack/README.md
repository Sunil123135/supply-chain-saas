# Yugam MedTech Starter Pack (Synthetic Data)

**Purpose:** P1 pilot for MedTech manufacturers — all five workflows (FEFO, forecast, allocation, replenishment, control tower) plus routing/trace demos.

**Important:** All SKUs use the fictional `YGM-*` prefix. Product **categories** are inspired by public industry taxonomies; we do **not** copy real manufacturer SKU catalogs, pricing, or proprietary product codes.

## Product taxonomy (industry-aligned)

Based on public medical-device industry primers and market segmentation:

| Category | Subcategories in pack | Examples (fictional) |
|----------|----------------------|----------------------|
| **Capital equipment** | surgical_robot, imaging_system, patient_monitor, lab_analyzer | Robotic platforms, C-arm, bedside monitors |
| **Implants** | knee_system, hip_system, spine_implant, trauma_plate, cardiovascular | Joint components, spine screws, stents |
| **Disposables** | surgical_instrument, surgical_drape_kit, infusion_set, wound_closure | Lap tools, drape packs, IV sets |
| **Spare parts** | robot_component, sensor_module, service_kit | Tracker assemblies, PM kits |
| **Consumables** | surgical_staple, energy_device_tip | Staple reloads, ESU tips |
| **Diagnostic (IVD)** | ivd_reagent, calibrator_control | Reagents, controls (subset of portfolio) |

### Therapeutic areas reflected (not exhaustive)

- Orthopedics & spine (implants, trauma, navigation/robotics ecosystem)
- Cardiovascular (stents, catheters)
- Surgical / MIS (instruments, energy, staples)
- Critical care adjacency (monitors)
- Capital + service parts (long lead times, serial/lot tracking)

### Public references (taxonomy only)

- [Medical Devices, IVD & Capital Equipment Industry Primer](https://umbrex.com/resources/industry-primers/life-sciences-industry-primers/medical-devices-diagnostics-capital-equipment-disposables-ivd-industry-primer/) — capital vs disposables vs IVD
- [How the Medical Device Industry Works](https://umbrex.com/resources/how-industries-work/healthcare-and-life-sciences/how-the-medical-device-industry-works/) — hospital/ASC buyers, implants vs capital
- [Technavio Medical Devices Market](https://www.technavio.com/report/medical-devices-market-industry-analysis) — diagnostic vs therapeutic vs monitoring segments
- Orthopedic robotics landscape (public clinical literature): Stryker Mako, Zimmer ROSA, DePuy VELYS, Smith+Nephew CORI, Globus ExcelsiusGPS, Medtronic Mazor — used only to shape **categories**, not SKU names

Major global medtech firms (Stryker, Zimmer Biomet, J&J MedTech/DePuy Synthes, Smith+Nephew, Medtronic, Stryker, Arthrex, Globus, etc.) inform **portfolio breadth**; Yugam synthetic SKUs are **not** their products.

## Files

| File | Rows (approx) | Use |
|------|---------------|-----|
| `sku_master.csv` | ~132 SKUs | Master data, lead times, ABC, lot flags |
| `lots_inventory.csv` | ~300+ lots | FEFO / expiry workflow |
| `demand_history.csv` | 104 weeks × SKUs | MAPE / forecast workflow |
| `open_orders.csv` | 55 orders | Allocation workflow |
| `allocation_rules.csv` | 4 rules | Shortage allocation |
| `shipments.csv` | 24 shipments | Dispatch, fill rate, India PINs |
| `customers.csv` | 6 customers | Tier A/B/C |
| `nodes.csv` | 5 nodes | Plant, DC, warehouses, service center |

## Regenerate

```powershell
cd supply-chain-saas
python scripts/generate_medtech_synthetic.py
```

Seed: `42` (reproducible).

## Import into Yugam (P1)

Upload via import wizard in order:

1. `nodes.csv`, `customers.csv`
2. `sku_master.csv`
3. `lots_inventory.csv`, `demand_history.csv`
4. `open_orders.csv`, `allocation_rules.csv`
5. `shipments.csv`

Replace any file with SAP/Excel/QO extracts using the same column headers; set `data_provenance` to `sap`, `excel`, or `qo`.

## What we do NOT include

- Real company SKU codes or confidential QuidelOrtho data
- Live GPS / government portal data (shipments use fictional vehicle numbers + PINs)
- Regulatory UDI/GTIN registration (can add column in P2)
