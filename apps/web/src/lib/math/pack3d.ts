/**
 * Extreme-point 3D bin packing into a vehicle container.
 * Places boxes (L×W×H) without overlap; respects weight.
 * Inspired by pallet-loading / 3D bin packing skills.
 */

export interface Box3D {
  id: string;
  l: number; // m
  w: number;
  h: number;
  weight_kg: number;
  qty?: number;
}

export interface Container3D {
  l: number;
  w: number;
  h: number;
  maxWeightKg: number;
  vehicle_type: string;
}

export interface PlacedBox {
  id: string;
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
  weight_kg: number;
}

export interface PackedLoad {
  load_id: string;
  vehicle_type: string;
  placements: PlacedBox[];
  used_volume_m3: number;
  used_weight_kg: number;
  fill_volume_pct: number;
  fill_weight_pct: number;
  fill_pct: number;
}

const VEHICLE_3D: Record<string, Container3D> = {
  "407": { l: 2.8, w: 1.7, h: 1.8, maxWeightKg: 2500, vehicle_type: "407" },
  "14ft": { l: 4.2, w: 2.1, h: 2.0, maxWeightKg: 4000, vehicle_type: "14ft" },
  "20ft": { l: 5.9, w: 2.35, h: 2.3, maxWeightKg: 7000, vehicle_type: "20ft" },
  "32ft": { l: 9.5, w: 2.4, h: 2.5, maxWeightKg: 12000, vehicle_type: "32ft" },
};

export function vehicleContainer(type: string): Container3D {
  return VEHICLE_3D[type] ?? VEHICLE_3D["14ft"]!;
}

function overlaps(a: PlacedBox, b: PlacedBox): boolean {
  return !(
    a.x + a.l <= b.x ||
    b.x + b.l <= a.x ||
    a.y + a.w <= b.y ||
    b.y + b.w <= a.y ||
    a.z + a.h <= b.z ||
    b.z + b.h <= a.z
  );
}

function fits(box: PlacedBox, c: Container3D): boolean {
  return box.x + box.l <= c.l + 1e-9 && box.y + box.w <= c.w + 1e-9 && box.z + box.h <= c.h + 1e-9;
}

/** Expand qty into individual boxes; sort by volume descending (FFD). */
function expandBoxes(boxes: Box3D[]): Box3D[] {
  const out: Box3D[] = [];
  for (const b of boxes) {
    const q = Math.max(1, Math.min(b.qty ?? 1, 40));
    for (let i = 0; i < q; i++) {
      out.push({
        id: q > 1 ? `${b.id}#${i + 1}` : b.id,
        l: b.l,
        w: b.w,
        h: b.h,
        weight_kg: b.weight_kg,
      });
    }
  }
  return out.sort((a, b) => b.l * b.w * b.h - a.l * a.w * a.h);
}

function tryPlace(
  box: Box3D,
  container: Container3D,
  placed: PlacedBox[],
  candidates: { x: number; y: number; z: number }[],
): PlacedBox | null {
  const orients: [number, number, number][] = [
    [box.l, box.w, box.h],
    [box.l, box.h, box.w],
    [box.w, box.l, box.h],
    [box.w, box.h, box.l],
    [box.h, box.l, box.w],
    [box.h, box.w, box.l],
  ];

  for (const pt of candidates) {
    for (const [l, w, h] of orients) {
      const cand: PlacedBox = {
        id: box.id,
        x: pt.x,
        y: pt.y,
        z: pt.z,
        l,
        w,
        h,
        weight_kg: box.weight_kg,
      };
      if (!fits(cand, container)) continue;
      if (placed.some((p) => overlaps(cand, p))) continue;
      return cand;
    }
  }
  return null;
}

export function pack3dIntoVehicles(
  boxes: Box3D[],
  vehicleType = "14ft",
  maxLoads = 12,
): {
  engine: "extreme-point-3d";
  capacity: Container3D;
  loads: PackedLoad[];
  unpacked: string[];
  summary: {
    loads: number;
    avgFillPct: number;
    boxesPacked: number;
    boxesUnpacked: number;
  };
} {
  const items = expandBoxes(boxes);
  const container = vehicleContainer(vehicleType);
  const remaining = [...items];
  const loads: PackedLoad[] = [];
  const unpacked: string[] = [];

  while (remaining.length > 0 && loads.length < maxLoads) {
    const placed: PlacedBox[] = [];
    let weight = 0;
    const candidates: { x: number; y: number; z: number }[] = [{ x: 0, y: 0, z: 0 }];
    const still: Box3D[] = [];

    for (const box of remaining) {
      if (weight + box.weight_kg > container.maxWeightKg) {
        still.push(box);
        continue;
      }
      const pos = tryPlace(box, container, placed, candidates);
      if (!pos) {
        still.push(box);
        continue;
      }
      placed.push(pos);
      weight += box.weight_kg;
      candidates.push(
        { x: pos.x + pos.l, y: pos.y, z: pos.z },
        { x: pos.x, y: pos.y + pos.w, z: pos.z },
        { x: pos.x, y: pos.y, z: pos.z + pos.h },
      );
    }

    if (placed.length === 0) {
      // Cannot place any remaining — mark unpacked and stop
      unpacked.push(...still.map((b) => b.id), ...remaining.map((b) => b.id));
      break;
    }

    const usedVol = placed.reduce((s, p) => s + p.l * p.w * p.h, 0);
    const capVol = container.l * container.w * container.h;
    const fillVol = Math.round((usedVol / capVol) * 1000) / 10;
    const fillWt = Math.round((weight / container.maxWeightKg) * 1000) / 10;

    loads.push({
      load_id: `3D-${String(loads.length + 1).padStart(3, "0")}`,
      vehicle_type: container.vehicle_type,
      placements: placed,
      used_volume_m3: Math.round(usedVol * 1000) / 1000,
      used_weight_kg: Math.round(weight * 10) / 10,
      fill_volume_pct: fillVol,
      fill_weight_pct: fillWt,
      fill_pct: Math.max(fillVol, fillWt),
    });

    remaining.length = 0;
    remaining.push(...still);
  }

  if (remaining.length && loads.length >= maxLoads) {
    unpacked.push(...remaining.map((b) => b.id));
  }

  const avgFill =
    loads.length > 0
      ? Math.round((loads.reduce((s, l) => s + l.fill_pct, 0) / loads.length) * 10) / 10
      : 0;
  const boxesPacked = loads.reduce((s, l) => s + l.placements.length, 0);

  return {
    engine: "extreme-point-3d",
    capacity: container,
    loads,
    unpacked: Array.from(new Set(unpacked)),
    summary: {
      loads: loads.length,
      avgFillPct: avgFill,
      boxesPacked,
      boxesUnpacked: unpacked.length,
    },
  };
}

/** Derive boxes from order lines + sku dims (fallback defaults). */
export function boxesFromOrders(
  orders: Record<string, string | number | undefined>[],
  skus: Record<string, string | number | undefined>[],
): Box3D[] {
  const skuMap = new Map(skus.map((s) => [String(s.sku_id), s]));
  return orders
    .filter((o) => String(o.status ?? "open").toLowerCase() === "open")
    .slice(0, 30)
    .map((o) => {
      const sku = skuMap.get(String(o.sku_id));
      const qty = Number(o.qty) || 1;
      const vol = Number(sku?.volume_m3) || 0.02;
      // Approximate cube root for missing LWH
      const side = Math.cbrt(vol);
      return {
        id: String(o.order_id ?? o.sku_id),
        l: Number(sku?.length_m) || side,
        w: Number(sku?.width_m) || side,
        h: Number(sku?.height_m) || side,
        weight_kg: (Number(sku?.weight_kg) || 5) * Math.min(qty, 1),
        qty: Math.min(qty, 8),
      };
    });
}
