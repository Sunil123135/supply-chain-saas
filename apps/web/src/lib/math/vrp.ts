/**
 * Capacitated VRP — Clarke–Wright savings + nearest-neighbor seed.
 * Uses India PIN prefix distance heuristic (no external matrix required).
 * Inspired by vehicle-routing-problem skill (CVRP two-index spirit).
 */

export interface VrpStop {
  id: string;
  demand: number;
  pincode?: string;
  lat?: number;
  lon?: number;
}

export interface VrpVehicle {
  id: string;
  capacity: number;
  type?: string;
}

export interface VrpRoute {
  vehicle_id: string;
  vehicle_type: string;
  stops: string[];
  load: number;
  distance_km: number;
  fill_pct: number;
}

function pinDistance(a?: string, b?: string): number {
  if (!a || !b) return 80;
  const pa = a.replace(/\D/g, "").slice(0, 3);
  const pb = b.replace(/\D/g, "").slice(0, 3);
  if (!pa || !pb) return 80;
  const da = Number(pa);
  const db = Number(pb);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 80;
  // Rough km from PIN prefix delta (India 3-digit zone heuristic)
  return Math.max(12, Math.abs(da - db) * 18 + (pa === pb ? 8 : 25));
}

function stopDist(a: VrpStop, b: VrpStop): number {
  if (a.lat != null && a.lon != null && b.lat != null && b.lon != null) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  return pinDistance(a.pincode, b.pincode);
}

function routeDistance(depot: VrpStop, stops: VrpStop[]): number {
  if (stops.length === 0) return 0;
  let d = stopDist(depot, stops[0]!);
  for (let i = 0; i < stops.length - 1; i++) {
    d += stopDist(stops[i]!, stops[i + 1]!);
  }
  d += stopDist(stops[stops.length - 1]!, depot);
  return Math.round(d * 10) / 10;
}

/** Clarke–Wright savings heuristic for CVRP. */
export function solveCvrp(opts: {
  depot: VrpStop;
  stops: VrpStop[];
  vehicles: VrpVehicle[];
}): {
  engine: "clarke-wright-cvrp";
  routes: VrpRoute[];
  summary: {
    vehiclesUsed: number;
    totalDistanceKm: number;
    unserved: number;
    avgFillPct: number;
  };
  unserved: string[];
} {
  const depot = opts.depot;
  const capacity = Math.max(...opts.vehicles.map((v) => v.capacity), 1);
  const remaining = [...opts.stops].filter((s) => s.demand > 0 && s.demand <= capacity);

  // Each customer starts as its own route
  type Route = { stops: VrpStop[]; load: number };
  let routes: Route[] = remaining.map((s) => ({ stops: [s], load: s.demand }));

  type Saving = { i: string; j: string; saving: number };
  const savings: Saving[] = [];
  for (let a = 0; a < remaining.length; a++) {
    for (let b = a + 1; b < remaining.length; b++) {
      const si = remaining[a]!;
      const sj = remaining[b]!;
      const saving =
        stopDist(depot, si) + stopDist(depot, sj) - stopDist(si, sj);
      savings.push({ i: si.id, j: sj.id, saving });
    }
  }
  savings.sort((x, y) => y.saving - x.saving);

  const findRoute = (id: string) => routes.findIndex((r) => r.stops.some((s) => s.id === id));
  const isEndpoint = (r: Route, id: string) =>
    r.stops[0]?.id === id || r.stops[r.stops.length - 1]?.id === id;

  for (const s of savings) {
    const ri = findRoute(s.i);
    const rj = findRoute(s.j);
    if (ri < 0 || rj < 0 || ri === rj) continue;
    const a = routes[ri]!;
    const b = routes[rj]!;
    if (!isEndpoint(a, s.i) || !isEndpoint(b, s.j)) continue;
    if (a.load + b.load > capacity) continue;

    // Orient so we merge i-end to j-start
    let left = [...a.stops];
    let right = [...b.stops];
    if (left[0]?.id === s.i) left = left.reverse();
    if (right[right.length - 1]?.id === s.j) right = right.reverse();
    if (left[left.length - 1]?.id !== s.i || right[0]?.id !== s.j) continue;

    const merged: Route = {
      stops: [...left, ...right],
      load: a.load + b.load,
    };
    routes = routes.filter((_, idx) => idx !== ri && idx !== rj);
    routes.push(merged);
  }

  // Assign to vehicles
  routes.sort((a, b) => b.load - a.load);
  const assigned: VrpRoute[] = [];
  const usedVehicles = [...opts.vehicles];
  const unserved: string[] = [];

  for (const r of routes) {
    const v = usedVehicles.shift();
    if (!v) {
      unserved.push(...r.stops.map((s) => s.id));
      continue;
    }
    const dist = routeDistance(depot, r.stops);
    assigned.push({
      vehicle_id: v.id,
      vehicle_type: v.type ?? "14ft",
      stops: r.stops.map((s) => s.id),
      load: Math.round(r.load * 10) / 10,
      distance_km: dist,
      fill_pct: Math.round((r.load / v.capacity) * 1000) / 10,
    });
  }

  const totalDistanceKm = assigned.reduce((s, r) => s + r.distance_km, 0);
  const avgFillPct =
    assigned.length > 0
      ? Math.round((assigned.reduce((s, r) => s + r.fill_pct, 0) / assigned.length) * 10) / 10
      : 0;

  return {
    engine: "clarke-wright-cvrp",
    routes: assigned,
    summary: {
      vehiclesUsed: assigned.length,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      unserved: unserved.length,
      avgFillPct,
    },
    unserved,
  };
}

/** Build VRP instance from shipment / order rows. */
export function vrpFromShipments(
  shipments: Record<string, string | number | undefined>[],
  opts: { vehicleCapacity?: number; maxVehicles?: number } = {},
) {
  const capacity = opts.vehicleCapacity ?? 100;
  const maxVehicles = opts.maxVehicles ?? 8;
  const depot: VrpStop = { id: "DEPOT", demand: 0, pincode: "110001" };

  const stops: VrpStop[] = shipments.slice(0, 40).map((s, i) => ({
    id: String(s.shipment_id ?? s.order_id ?? `STOP-${i + 1}`),
    demand: Math.max(1, Number(s.fill_rate_pct) || Number(s.qty) || 20),
    pincode: String(s.dest_pincode ?? s.pincode ?? ""),
  }));

  // Normalize demand to fit capacity scale (fill% → units)
  for (const st of stops) {
    st.demand = Math.min(capacity, Math.max(5, st.demand));
  }

  const vehicles: VrpVehicle[] = Array.from({ length: maxVehicles }, (_, i) => ({
    id: `VH-${String(i + 1).padStart(2, "0")}`,
    capacity,
    type: i % 3 === 0 ? "32ft" : i % 2 === 0 ? "20ft" : "14ft",
  }));

  return solveCvrp({ depot, stops, vehicles });
}
