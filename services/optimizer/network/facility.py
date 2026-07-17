"""Network design — capacitated facility location MIP (DC rationalization)."""

from __future__ import annotations

from typing import Any


def _pin_km(a: str, b: str) -> float:
    pa = "".join(c for c in a if c.isdigit())[:3]
    pb = "".join(c for c in b if c.isdigit())[:3]
    if not pa or not pb:
        return 250.0
    try:
        return max(40.0, abs(int(pa) - int(pb)) * 22.0 + 30.0)
    except ValueError:
        return 250.0


def _heuristic_facility(
    facilities: list[dict[str, Any]],
    customers: list[dict[str, Any]],
    max_open: int | None,
) -> dict[str, Any]:
    """Greedy: open cheapest facilities by fixed/capacity until demand covered."""
    facs = sorted(
        facilities,
        key=lambda f: float(f.get("fixed_cost") or 5e5) / max(float(f.get("capacity") or 1), 1),
    )
    if max_open:
        facs = facs[:max_open]
    demand_left = {str(c["id"]): float(c["demand"]) for c in customers}
    open_ids: list[str] = []
    flows: list[dict[str, Any]] = []
    fixed = 0.0
    transport = 0.0

    for f in facs:
        fid = str(f["id"])
        cap = float(f.get("capacity") or 3000)
        used = 0.0
        opened = False
        ranked = sorted(
            customers,
            key=lambda c: _pin_km(str(f.get("pincode") or ""), str(c.get("pincode") or "")),
        )
        for c in ranked:
            cid = str(c["id"])
            need = demand_left.get(cid, 0.0)
            if need <= 0 or used >= cap:
                continue
            ship = min(need, cap - used)
            if not opened:
                open_ids.append(fid)
                fixed += float(f.get("fixed_cost") or 5e5)
                opened = True
            km = _pin_km(str(f.get("pincode") or ""), str(c.get("pincode") or ""))
            cost_per_unit = km * 0.35
            transport += ship * cost_per_unit
            used += ship
            demand_left[cid] = need - ship
            flows.append(
                {
                    "from": fid,
                    "to": cid,
                    "qty": round(ship, 1),
                    "cost": round(ship * cost_per_unit, 0),
                }
            )
        if max_open and len(open_ids) >= max_open:
            break

    unmet = sum(demand_left.values())
    return {
        "engine": "greedy-facility",
        "status": "Heuristic",
        "open_facilities": open_ids,
        "flows": flows[:80],
        "summary": {
            "numOpen": len(open_ids),
            "fixedCostInr": round(fixed, 0),
            "transportCostInr": round(transport, 0),
            "totalCostInr": round(fixed + transport, 0),
            "unmetDemand": round(unmet, 1),
        },
    }


def facility_location_mip(
    facilities: list[dict[str, Any]],
    customers: list[dict[str, Any]],
    max_open: int | None = None,
    time_limit_sec: int = 8,
) -> dict[str, Any]:
    """
    Capacitated facility location:
      min Σ fixed_j y_j + Σ c_ij x_ij
      s.t. Σ_j x_ij = d_i,  Σ_i x_ij ≤ Cap_j y_j,  y binary
    Prefer PuLP+CBC; fall back to OR-Tools CP-SAT; then greedy.
    """
    if not facilities or not customers:
        return {
            "engine": "facility-mip",
            "status": "Empty",
            "open_facilities": [],
            "flows": [],
            "summary": {
                "numOpen": 0,
                "fixedCostInr": 0,
                "transportCostInr": 0,
                "totalCostInr": 0,
                "unmetDemand": 0,
            },
        }

    facilities = facilities[:12]
    customers = customers[:30]

    try:
        from pulp import (
            PULP_CBC_CMD,
            LpMinimize,
            LpProblem,
            LpStatus,
            LpVariable,
            lpSum,
            value,
        )

        prob = LpProblem("DC_Rationalization", LpMinimize)
        y = {str(f["id"]): LpVariable(f"open_{f['id']}", cat="Binary") for f in facilities}
        x = {}
        for c in customers:
            for f in facilities:
                key = (str(c["id"]), str(f["id"]))
                x[key] = LpVariable(f"ship_{c['id']}_{f['id']}", lowBound=0)

        fixed = lpSum(float(f.get("fixed_cost") or 5e5) * y[str(f["id"])] for f in facilities)
        transport = lpSum(
            _pin_km(str(f.get("pincode") or ""), str(c.get("pincode") or ""))
            * 0.35
            * x[(str(c["id"]), str(f["id"]))]
            for c in customers
            for f in facilities
        )
        prob += fixed + transport

        for c in customers:
            cid = str(c["id"])
            demand = float(c["demand"])
            prob += lpSum(x[(cid, str(f["id"]))] for f in facilities) == demand

        for f in facilities:
            fid = str(f["id"])
            cap = float(f.get("capacity") or 3000)
            prob += lpSum(x[(str(c["id"]), fid)] for c in customers) <= cap * y[fid]

        if max_open is not None:
            prob += lpSum(y[str(f["id"])] for f in facilities) <= max_open

        prob.solve(PULP_CBC_CMD(msg=0, timeLimit=time_limit_sec))
        open_ids = [fid for fid, var in y.items() if var.varValue and var.varValue > 0.5]
        flows = []
        for (cid, fid), var in x.items():
            qty = var.varValue or 0
            if qty > 0.01:
                f = next(ff for ff in facilities if str(ff["id"]) == fid)
                c = next(cc for cc in customers if str(cc["id"]) == cid)
                unit = _pin_km(str(f.get("pincode") or ""), str(c.get("pincode") or "")) * 0.35
                flows.append(
                    {"from": fid, "to": cid, "qty": round(qty, 1), "cost": round(qty * unit, 0)}
                )

        total = value(prob.objective) or 0
        fixed_v = sum(
            float(f.get("fixed_cost") or 5e5) for f in facilities if str(f["id"]) in open_ids
        )
        return {
            "engine": "pulp-cbc-facility-mip",
            "status": LpStatus[prob.status],
            "open_facilities": open_ids,
            "flows": flows[:80],
            "summary": {
                "numOpen": len(open_ids),
                "fixedCostInr": round(fixed_v, 0),
                "transportCostInr": round(total - fixed_v, 0),
                "totalCostInr": round(total, 0),
                "unmetDemand": 0,
            },
        }
    except Exception:
        pass

    try:
        from ortools.sat.python import cp_model

        model = cp_model.CpModel()
        y = {str(f["id"]): model.NewBoolVar(f"open_{f['id']}") for f in facilities}
        x = {}
        for c in customers:
            for f in facilities:
                key = (str(c["id"]), str(f["id"]))
                dem = int(float(c["demand"]))
                x[key] = model.NewIntVar(0, dem, f"ship_{c['id']}_{f['id']}")

        for c in customers:
            cid = str(c["id"])
            dem = int(float(c["demand"]))
            model.Add(sum(x[(cid, str(f["id"]))] for f in facilities) == dem)

        for f in facilities:
            fid = str(f["id"])
            cap = int(float(f.get("capacity") or 3000))
            model.Add(sum(x[(str(c["id"]), fid)] for c in customers) <= cap * y[fid])

        if max_open is not None:
            model.Add(sum(y.values()) <= max_open)

        obj_terms = []
        for f in facilities:
            fid = str(f["id"])
            obj_terms.append(int(float(f.get("fixed_cost") or 5e5)) * y[fid])
        for c in customers:
            for f in facilities:
                unit = int(
                    _pin_km(str(f.get("pincode") or ""), str(c.get("pincode") or "")) * 0.35
                )
                obj_terms.append(unit * x[(str(c["id"]), str(f["id"]))])
        model.Minimize(sum(obj_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = float(time_limit_sec)
        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError("infeasible")

        open_ids = [fid for fid, var in y.items() if solver.Value(var) == 1]
        flows = []
        transport = 0.0
        for (cid, fid), var in x.items():
            qty = solver.Value(var)
            if qty > 0:
                f = next(ff for ff in facilities if str(ff["id"]) == fid)
                c = next(cc for cc in customers if str(cc["id"]) == cid)
                unit = _pin_km(str(f.get("pincode") or ""), str(c.get("pincode") or "")) * 0.35
                cost = qty * unit
                transport += cost
                flows.append({"from": fid, "to": cid, "qty": qty, "cost": round(cost, 0)})
        fixed_v = sum(
            float(f.get("fixed_cost") or 5e5) for f in facilities if str(f["id"]) in open_ids
        )
        return {
            "engine": "ortools-cpsat-facility",
            "status": "Optimal" if status == cp_model.OPTIMAL else "Feasible",
            "open_facilities": open_ids,
            "flows": flows[:80],
            "summary": {
                "numOpen": len(open_ids),
                "fixedCostInr": round(fixed_v, 0),
                "transportCostInr": round(transport, 0),
                "totalCostInr": round(fixed_v + transport, 0),
                "unmetDemand": 0,
            },
        }
    except Exception:
        pass

    return _heuristic_facility(facilities, customers, max_open)


def network_from_nodes(
    nodes: list[dict[str, Any]],
    demand_history: list[dict[str, Any]],
    max_open: int | None = None,
) -> dict[str, Any]:
    """Build facility/customer sets from Yugam starter-pack shaped rows."""
    facilities = []
    customers = []
    for n in nodes:
        nid = str(n.get("node_id") or n.get("id") or "")
        ntype = str(n.get("node_type") or "").lower()
        pin = str(n.get("pincode") or "")
        if any(t in ntype for t in ("dc", "wh", "cfa", "plant", "hub")):
            facilities.append(
                {
                    "id": nid,
                    "pincode": pin,
                    "fixed_cost": float(n.get("fixed_cost") or (4e5 if "plant" in ntype else 2.5e5)),
                    "capacity": float(n.get("capacity") or (8000 if "plant" in ntype else 4000)),
                }
            )
        else:
            customers.append({"id": nid, "pincode": pin, "demand": 0.0})

    demand_by: dict[str, float] = {}
    for row in demand_history:
        dest = str(row.get("node_id") or row.get("dest_node_id") or "")
        qty = float(row.get("qty") or 0)
        if dest:
            demand_by[dest] = demand_by.get(dest, 0.0) + qty

    if not customers and facilities:
        total = sum(float(r.get("qty") or 0) for r in demand_history[-200:]) or 1000.0
        share = total / max(len(facilities), 1)
        customers = [
            {
                "id": f"CUST-{i + 1}",
                "pincode": str(f.get("pincode") or "110001"),
                "demand": share * (0.8 + 0.1 * (i % 3)),
            }
            for i, f in enumerate(facilities[:8])
        ]
    else:
        for c in customers:
            c["demand"] = demand_by.get(str(c["id"]), c.get("demand") or 200.0)
        if not any(c["demand"] > 0 for c in customers):
            for c in customers:
                c["demand"] = 200.0

    if not facilities:
        facilities = [
            {"id": "DC-NCR", "pincode": "110001", "fixed_cost": 500000, "capacity": 5000},
            {"id": "DC-MUM", "pincode": "400001", "fixed_cost": 450000, "capacity": 4500},
            {"id": "DC-BLR", "pincode": "560001", "fixed_cost": 400000, "capacity": 4000},
        ]

    return facility_location_mip(facilities, customers, max_open=max_open)
