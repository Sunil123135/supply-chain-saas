import { NextResponse } from "next/server";

import { loadAllPacks, loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";

/** Auto-serve bundled industry data — no user upload required. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry") as IndustryPack | null;

  if (industry === "medtech" || industry === "cpg") {
    const pack = await loadIndustryPack(industry);
    return NextResponse.json({
      mode: "auto",
      provenance: "bundled_starter_pack",
      industry,
      stats: pack.stats,
      loadedAt: pack.loadedAt,
      sample: {
        skus: pack.files.sku_master?.rows.slice(0, 5) ?? [],
        nearExpiry: (pack.files.lots_inventory?.rows ?? [])
          .filter((r) => r.expiry_date)
          .slice(0, 5),
        shipments: pack.files.shipments?.rows.slice(0, 5) ?? [],
      },
    });
  }

  const all = await loadAllPacks();
  return NextResponse.json({
    mode: "auto",
    provenance: "bundled_starter_pack",
    industries: {
      medtech: all.medtech.stats,
      cpg: all.cpg.stats,
    },
    loadedAt: new Date().toISOString(),
  });
}
