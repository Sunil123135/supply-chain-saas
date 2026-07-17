import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

import { hydratePackFromSupabase } from "@/lib/data/orgWorkspace";
import { IMPORT_FILES, PACK_PATHS, type IndustryPack } from "@/lib/import/config";
import { parseCsv } from "@/lib/import/parseCsv";

export interface LoadedPack {
  industry: IndustryPack;
  packPath: string;
  loadedAt: string;
  /** Where inventory/SKU/node/freight rows came from after hydrate. */
  dataSource: "supabase" | "csv";
  orgId: string | null;
  files: Record<string, { headers: string[]; rows: Record<string, string>[] }>;
  stats: {
    skuCount: number;
    lotCount: number;
    demandRows: number;
    orderCount: number;
    shipmentCount: number;
    nodeCount: number;
    nearExpiryLots: number;
  };
}

export type LoadPackOptions = {
  /** When false, skip Supabase overlay (used by seed). Default true. */
  preferSupabase?: boolean;
};

function dataRoot(): string {
  const candidates = [
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "..", "..", "data"),
    process.env.YUGAM_DATA_ROOT,
  ].filter((p): p is string => Boolean(p));
  for (const dir of candidates) {
    if (existsSync(path.join(dir, PACK_PATHS.medtech))) {
      return dir;
    }
  }
  return candidates[0]!;
}

export async function loadIndustryPack(
  industry: IndustryPack,
  opts: LoadPackOptions = {},
): Promise<LoadedPack> {
  const preferSupabase = opts.preferSupabase !== false;
  const packDir = path.join(dataRoot(), PACK_PATHS[industry]);
  const files: LoadedPack["files"] = {};

  for (const spec of IMPORT_FILES) {
    try {
      const raw = await readFile(path.join(packDir, spec.filename), "utf-8");
      const parsed = parseCsv(raw);
      files[spec.key] = { headers: parsed.headers, rows: parsed.rows };
    } catch {
      files[spec.key] = { headers: [], rows: [] };
    }
  }

  const skus = files.sku_master?.rows ?? [];
  const lots = files.lots_inventory?.rows ?? [];
  const today = new Date();
  const nearExpiryLots = lots.filter((lot) => {
    const exp = lot.expiry_date;
    if (!exp) return false;
    const d = new Date(exp);
    const days = (d.getTime() - today.getTime()) / 86400000;
    return days >= 0 && days <= 60;
  }).length;

  const csvStats = {
    skuCount: skus.length,
    lotCount: lots.length,
    demandRows: files.demand_history?.rows.length ?? 0,
    orderCount: files.open_orders?.rows.length ?? 0,
    shipmentCount: files.shipments?.rows.length ?? 0,
    nodeCount: files.nodes?.rows.length ?? 0,
    nearExpiryLots,
  };

  if (!preferSupabase) {
    return {
      industry,
      packPath: PACK_PATHS[industry],
      loadedAt: new Date().toISOString(),
      dataSource: "csv",
      orgId: null,
      files,
      stats: csvStats,
    };
  }

  const hydrated = await hydratePackFromSupabase(industry, files, csvStats);

  return {
    industry,
    packPath: PACK_PATHS[industry],
    loadedAt: new Date().toISOString(),
    dataSource: hydrated.source,
    orgId: hydrated.orgId,
    files: hydrated.files,
    stats: hydrated.stats,
  };
}

export async function loadAllPacks(
  opts: LoadPackOptions = {},
): Promise<Record<IndustryPack, LoadedPack>> {
  const industries: IndustryPack[] = ["medtech", "cpg"];
  const entries = await Promise.all(
    industries.map(async (i) => [i, await loadIndustryPack(i, opts)] as const),
  );
  return Object.fromEntries(entries) as Record<IndustryPack, LoadedPack>;
}
