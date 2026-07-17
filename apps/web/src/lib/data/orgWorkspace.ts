import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { IndustryPack } from "@/lib/import/config";

export async function findDemoOrgId(industry: IndustryPack): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from("organizations")
    .select("id")
    .eq("org_type", industry)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.id ?? null;
}

export async function ensureDemoOrg(industry: IndustryPack): Promise<string | null> {
  const existing = await findDemoOrgId(industry);
  if (existing) return existing;
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from("organizations")
    .insert({
      name: `Yugam Demo ${industry}`,
      org_type: industry,
    })
    .select("id")
    .single();
  if (error) return null;
  return data?.id ?? null;
}

type StrRow = Record<string, string>;

function asStr(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

/** Overlay Supabase workspace rows onto a CSV pack when service role is configured. */
export async function hydratePackFromSupabase(
  industry: IndustryPack,
  files: Record<string, { headers: string[]; rows: StrRow[] }>,
  stats: {
    skuCount: number;
    lotCount: number;
    demandRows: number;
    orderCount: number;
    shipmentCount: number;
    nodeCount: number;
    nearExpiryLots: number;
  },
): Promise<{
  files: Record<string, { headers: string[]; rows: StrRow[] }>;
  stats: typeof stats;
  source: "supabase" | "csv";
  orgId: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { files, stats, source: "csv", orgId: null };
  }

  const orgId = await findDemoOrgId(industry);
  if (!orgId) {
    return { files, stats, source: "csv", orgId: null };
  }

  const sb = getSupabaseAdmin()!;
  const [lotsRes, skusRes, nodesRes, freightRes] = await Promise.all([
    sb.from("lots_inventory").select("sku_id,lot_id,mfg_date,expiry_date,qty,node_id,unit_cost_inr,data_provenance").eq("org_id", orgId).limit(5000),
    sb.from("skus").select("sku_id,sku_name,category,subcategory,abc_class,lead_time_days,data_provenance").eq("org_id", orgId).limit(2000),
    sb.from("nodes").select("node_id,node_type,city,pincode").eq("org_id", orgId).limit(500),
    sb.from("freight_invoices").select("invoice_id,shipment_id,carrier_name,lane_key,vehicle_type,billed_inr,contract_inr,variance_inr,audit_status").eq("org_id", orgId).limit(5000),
  ]);

  const next = { ...files };
  let source: "supabase" | "csv" = "csv";

  if (lotsRes.data && lotsRes.data.length > 0) {
    source = "supabase";
    next.lots_inventory = {
      headers: ["sku_id", "lot_id", "mfg_date", "expiry_date", "qty", "node_id", "unit_cost_inr", "data_provenance"],
      rows: lotsRes.data.map((l) => ({
        sku_id: asStr(l.sku_id),
        lot_id: asStr(l.lot_id),
        mfg_date: asStr(l.mfg_date),
        expiry_date: asStr(l.expiry_date),
        qty: asStr(l.qty),
        node_id: asStr(l.node_id),
        unit_cost_inr: asStr(l.unit_cost_inr),
        data_provenance: asStr(l.data_provenance) || "supabase",
      })),
    };
  }

  if (skusRes.data && skusRes.data.length > 0) {
    source = "supabase";
    next.sku_master = {
      headers: ["sku_id", "sku_name", "category", "subcategory", "abc_class", "lead_time_days", "data_provenance"],
      rows: skusRes.data.map((s) => ({
        sku_id: asStr(s.sku_id),
        sku_name: asStr(s.sku_name),
        category: asStr(s.category),
        subcategory: asStr(s.subcategory),
        abc_class: asStr(s.abc_class),
        lead_time_days: asStr(s.lead_time_days),
        data_provenance: asStr(s.data_provenance) || "supabase",
      })),
    };
  }

  if (nodesRes.data && nodesRes.data.length > 0) {
    next.nodes = {
      headers: ["node_id", "node_type", "city", "pincode"],
      rows: nodesRes.data.map((n) => ({
        node_id: asStr(n.node_id),
        node_type: asStr(n.node_type),
        city: asStr(n.city),
        pincode: asStr(n.pincode),
      })),
    };
  }

  if (freightRes.data && freightRes.data.length > 0) {
    next.freight_invoices = {
      headers: [
        "invoice_id",
        "shipment_id",
        "carrier_name",
        "lane_key",
        "vehicle_type",
        "billed_inr",
        "contract_inr",
        "variance_inr",
        "audit_status",
      ],
      rows: freightRes.data.map((f) => ({
        invoice_id: asStr(f.invoice_id),
        shipment_id: asStr(f.shipment_id),
        carrier_name: asStr(f.carrier_name),
        lane_key: asStr(f.lane_key),
        vehicle_type: asStr(f.vehicle_type),
        billed_inr: asStr(f.billed_inr),
        contract_inr: asStr(f.contract_inr),
        variance_inr: asStr(f.variance_inr),
        audit_status: asStr(f.audit_status),
      })),
    };
  }

  const lots = next.lots_inventory?.rows ?? [];
  const today = new Date();
  const nearExpiryLots = lots.filter((lot) => {
    const exp = lot.expiry_date;
    if (!exp) return false;
    const d = new Date(exp);
    const days = (d.getTime() - today.getTime()) / 86400000;
    return days >= 0 && days <= 60;
  }).length;

  return {
    files: next,
    stats: {
      ...stats,
      skuCount: next.sku_master?.rows.length ?? stats.skuCount,
      lotCount: lots.length || stats.lotCount,
      nodeCount: next.nodes?.rows.length ?? stats.nodeCount,
      nearExpiryLots: lots.length ? nearExpiryLots : stats.nearExpiryLots,
    },
    source,
    orgId,
  };
}
