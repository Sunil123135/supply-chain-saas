export interface ShipmentRow {
  shipment_id: string;
  origin_node_id?: string;
  dest_pincode?: string;
  vehicle_type?: string;
  fill_rate_pct?: string | number;
  status?: string;
  [key: string]: string | number | undefined;
}

export interface FreightInvoice {
  invoice_id: string;
  shipment_id: string;
  carrier_name: string;
  lane_key: string;
  vehicle_type: string;
  contract_inr: number;
  billed_inr: number;
  variance_inr: number;
  variance_pct: number;
  audit_status: "match" | "overbill" | "underbill";
  flags: string[];
}

const BASE_RATES: Record<string, number> = {
  "14ft": 18500,
  "32ft": 42000,
  "407": 28000,
  truck: 35000,
};

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function laneKey(origin: string, dest: string): string {
  const prefix = (dest ?? "").slice(0, 3);
  return `${origin ?? "UNK"}→${prefix}`;
}

function contractRate(vehicleType: string, fillRate: number): number {
  const base = BASE_RATES[vehicleType] ?? BASE_RATES.truck;
  const fuel = 1.08;
  const utilizationAdj = fillRate < 0.6 ? 1.05 : 1;
  return Math.round(base * fuel * utilizationAdj);
}

/** Build synthetic carrier invoices from shipments (deterministic overbilling for audit demo). */
export function buildInvoicesFromShipments(shipments: ShipmentRow[]): FreightInvoice[] {
  return shipments.map((s, i) => {
    const vt = s.vehicle_type ?? "truck";
    const fill = num(s.fill_rate_pct);
    const contract = contractRate(vt, fill);
    const overbillFactor = i % 4 === 0 ? 1.12 : i % 7 === 0 ? 1.06 : 1;
    const accessorial = i % 5 === 0 ? 2500 : 0;
    const billed = Math.round(contract * overbillFactor + accessorial);
    const variance = billed - contract;
    const variancePct = contract > 0 ? (variance / contract) * 100 : 0;
    const flags: string[] = [];
    if (overbillFactor > 1) flags.push("Rate above contract band");
    if (accessorial > 0) flags.push("Uncontracted accessorial");
    if (fill < 0.55) flags.push("Low fill — detention risk");

    return {
      invoice_id: `INV-${s.shipment_id}`,
      shipment_id: s.shipment_id,
      carrier_name: `Carrier-${(i % 3) + 1}`,
      lane_key: laneKey(s.origin_node_id ?? "", s.dest_pincode ?? ""),
      vehicle_type: vt,
      contract_inr: contract,
      billed_inr: billed,
      variance_inr: variance,
      variance_pct: Math.round(variancePct * 10) / 10,
      audit_status: variance > 500 ? "overbill" : variance < -100 ? "underbill" : "match",
      flags,
    };
  });
}

export function auditFreightInvoices(invoices: FreightInvoice[]) {
  const disputes = invoices.filter((i) => i.audit_status === "overbill");
  const recoverable = disputes.reduce((s, i) => s + Math.max(0, i.variance_inr), 0);
  return {
    totalInvoices: invoices.length,
    matches: invoices.filter((i) => i.audit_status === "match").length,
    overbilled: disputes.length,
    recoverableInr: recoverable,
    disputes: disputes.sort((a, b) => b.variance_inr - a.variance_inr),
    leakagePct:
      invoices.length > 0
        ? Math.round((recoverable / invoices.reduce((s, i) => s + i.billed_inr, 0)) * 1000) / 10
        : 0,
  };
}
