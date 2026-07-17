"""CVRP via OR-Tools when available; Clarke-Wright fallback otherwise."""

from __future__ import annotations

from typing import Any


def _pin_distance(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 80.0
    pa = "".join(c for c in a if c.isdigit())[:3]
    pb = "".join(c for c in b if c.isdigit())[:3]
    if not pa or not pb:
        return 80.0
    try:
        da, db = int(pa), int(pb)
    except ValueError:
        return 80.0
    return max(12.0, abs(da - db) * 18.0 + (8.0 if pa == pb else 25.0))


def _clarke_wright(stops: list[dict[str, Any]], capacity: float, max_vehicles: int) -> dict[str, Any]:
    depot_pin = "110001"
    remaining = [s for s in stops if float(s.get("demand", 0)) > 0]
    routes: list[list[dict[str, Any]]] = [[s] for s in remaining]

    savings: list[tuple[float, str, str]] = []
    for i, si in enumerate(remaining):
        for sj in remaining[i + 1 :]:
            sav = (
                _pin_distance(depot_pin, str(si.get("pincode")))
                + _pin_distance(depot_pin, str(sj.get("pincode")))
                - _pin_distance(str(si.get("pincode")), str(sj.get("pincode")))
            )
            savings.append((sav, str(si["id"]), str(sj["id"])))
    savings.sort(reverse=True)

    def find_route(sid: str) -> int:
        for idx, r in enumerate(routes):
            if any(str(x["id"]) == sid for x in r):
                return idx
        return -1

    def is_end(r: list[dict[str, Any]], sid: str) -> bool:
        return str(r[0]["id"]) == sid or str(r[-1]["id"]) == sid

    for sav, i_id, j_id in savings:
        ri, rj = find_route(i_id), find_route(j_id)
        if ri < 0 or rj < 0 or ri == rj:
            continue
        a, b = routes[ri], routes[rj]
        if not is_end(a, i_id) or not is_end(b, j_id):
            continue
        load_a = sum(float(x.get("demand", 0)) for x in a)
        load_b = sum(float(x.get("demand", 0)) for x in b)
        if load_a + load_b > capacity:
            continue
        left, right = list(a), list(b)
        if str(left[0]["id"]) == i_id:
            left = list(reversed(left))
        if str(right[-1]["id"]) == j_id:
            right = list(reversed(right))
        if str(left[-1]["id"]) != i_id or str(right[0]["id"]) != j_id:
            continue
        merged = left + right
        routes = [r for k, r in enumerate(routes) if k not in (ri, rj)]
        routes.append(merged)

    routes.sort(key=lambda r: -sum(float(x.get("demand", 0)) for x in r))
    out_routes = []
    unserved: list[str] = []
    for idx, r in enumerate(routes):
        if idx >= max_vehicles:
            unserved.extend(str(x["id"]) for x in r)
            continue
        load = sum(float(x.get("demand", 0)) for x in r)
        dist = _pin_distance(depot_pin, str(r[0].get("pincode")))
        for a, b in zip(r, r[1:]):
            dist += _pin_distance(str(a.get("pincode")), str(b.get("pincode")))
        dist += _pin_distance(str(r[-1].get("pincode")), depot_pin)
        out_routes.append(
            {
                "vehicle_id": f"VH-{idx + 1:02d}",
                "vehicle_type": "14ft",
                "stops": [str(x["id"]) for x in r],
                "load": round(load, 1),
                "distance_km": round(dist, 1),
                "fill_pct": round(100.0 * load / capacity, 1),
            }
        )

    total = sum(r["distance_km"] for r in out_routes)
    avg_fill = (
        round(sum(r["fill_pct"] for r in out_routes) / len(out_routes), 1) if out_routes else 0
    )
    return {
        "engine": "clarke-wright-cvrp",
        "routes": out_routes,
        "unserved": unserved,
        "summary": {
            "vehiclesUsed": len(out_routes),
            "totalDistanceKm": round(total, 1),
            "unserved": len(unserved),
            "avgFillPct": avg_fill,
        },
    }


def _ortools_cvrp(stops: list[dict[str, Any]], capacity: int, max_vehicles: int) -> dict[str, Any] | None:
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
    except ImportError:
        return None

    n = len(stops)
    if n == 0:
        return {
            "engine": "ortools-cvrp",
            "routes": [],
            "unserved": [],
            "summary": {"vehiclesUsed": 0, "totalDistanceKm": 0, "unserved": 0, "avgFillPct": 0},
        }

    # Nodes: 0 = depot
    dist = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n):
        dist[0][i + 1] = int(_pin_distance("110001", str(stops[i].get("pincode"))))
        dist[i + 1][0] = dist[0][i + 1]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            dist[i + 1][j + 1] = int(
                _pin_distance(str(stops[i].get("pincode")), str(stops[j].get("pincode")))
            )

    demands = [0] + [int(float(s.get("demand", 1))) for s in stops]
    manager = pywrapcp.RoutingIndexManager(n + 1, max_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_cb(from_index: int, to_index: int) -> int:
        f = manager.IndexToNode(from_index)
        t = manager.IndexToNode(to_index)
        return dist[f][t]

    transit = routing.RegisterTransitCallback(distance_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(transit)

    def demand_cb(from_index: int) -> int:
        return demands[manager.IndexToNode(from_index)]

    demand_idx = routing.RegisterUnaryTransitCallback(demand_cb)
    routing.AddDimensionWithVehicleCapacity(
        demand_idx, 0, [capacity] * max_vehicles, True, "Capacity"
    )

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    params.time_limit.FromSeconds(2)

    solution = routing.SolveWithParameters(params)
    if not solution:
        return None

    out_routes = []
    for v in range(max_vehicles):
        index = routing.Start(v)
        stops_ids: list[str] = []
        load = 0
        route_dist = 0
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != 0:
                stops_ids.append(str(stops[node - 1]["id"]))
                load += demands[node]
            prev = index
            index = solution.Value(routing.NextVar(index))
            route_dist += routing.GetArcCostForVehicle(prev, index, v)
        if stops_ids:
            out_routes.append(
                {
                    "vehicle_id": f"VH-{v + 1:02d}",
                    "vehicle_type": "14ft",
                    "stops": stops_ids,
                    "load": load,
                    "distance_km": route_dist,
                    "fill_pct": round(100.0 * load / capacity, 1),
                }
            )

    total = sum(r["distance_km"] for r in out_routes)
    avg_fill = (
        round(sum(r["fill_pct"] for r in out_routes) / len(out_routes), 1) if out_routes else 0
    )
    return {
        "engine": "ortools-cvrp",
        "routes": out_routes,
        "unserved": [],
        "summary": {
            "vehiclesUsed": len(out_routes),
            "totalDistanceKm": total,
            "unserved": 0,
            "avgFillPct": avg_fill,
        },
    }


def solve_vrp(
    shipments: list[dict[str, Any]],
    capacity: int = 100,
    max_vehicles: int = 8,
) -> dict[str, Any]:
    stops = []
    for i, s in enumerate(shipments[:40]):
        stops.append(
            {
                "id": str(s.get("id") or s.get("shipment_id") or f"STOP-{i + 1}"),
                "demand": min(capacity, max(5, float(s.get("demand", 20)))),
                "pincode": str(s.get("pincode") or s.get("dest_pincode") or ""),
            }
        )
    ort = _ortools_cvrp(stops, capacity, max_vehicles)
    if ort:
        return ort
    return _clarke_wright(stops, float(capacity), max_vehicles)
