import { NextResponse } from "next/server";

import { auditFreightInvoices, buildInvoicesFromShipments } from "@/lib/math/freight";
import { loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = (searchParams.get("industry") as IndustryPack) ?? "medtech";

  const pack = await loadIndustryPack(industry);
  const shipments = (pack.files.shipments?.rows ?? []) as import("@/lib/math/freight").ShipmentRow[];
  const invoices = buildInvoicesFromShipments(shipments);
  const audit = auditFreightInvoices(invoices);

  return NextResponse.json({ industry, invoices, audit, engine: "freight-audit-v1" });
}
