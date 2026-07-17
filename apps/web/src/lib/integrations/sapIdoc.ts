/**
 * SAP IDoc field mapper — MATNR / WERKS / CHARG → Yugam sku / node / lot.
 * Accepts flat SAP export rows or nested IDoc segments (E1MARAM, E1MARCM, E1MCHB).
 */

export type SapRow = Record<string, unknown>;

export interface MappedLot {
  sku_id: string;
  node_id: string;
  lot_id: string;
  qty_on_hand: number;
  expiry_date?: string;
  manufacturing_date?: string;
  uom?: string;
  plant?: string;
  material?: string;
  source: "sap_idoc";
}

export interface MappedSku {
  sku_id: string;
  description?: string;
  uom?: string;
  plant?: string;
  source: "sap_idoc";
}

export interface MappedNode {
  node_id: string;
  name?: string;
  node_type: string;
  plant?: string;
  source: "sap_idoc";
}

export interface SapMapResult {
  engine: "sap-idoc-mapper";
  lots: MappedLot[];
  skus: MappedSku[];
  nodes: MappedNode[];
  unmappedFields: string[];
  summary: { lots: number; skus: number; nodes: number; rowsIn: number };
}

const FIELD_ALIASES: Record<string, string[]> = {
  matnr: ["MATNR", "matnr", "material", "MATERIAL", "sku_id", "SKU", "sku"],
  werks: ["WERKS", "werks", "plant", "PLANT", "node_id", "site", "SITE"],
  charg: ["CHARG", "charg", "batch", "BATCH", "lot_id", "LOT", "lot"],
  menge: ["MENGE", "menge", "CLABS", "clabs", "qty", "QTY", "qty_on_hand", "LABST"],
  vfdat: ["VFDAT", "vfdat", "expiry", "EXPIRY", "expiry_date", "SLED"],
  hsdat: ["HSDAT", "hsdat", "mfg_date", "manufacturing_date", "HSDAT_DATE"],
  meins: ["MEINS", "meins", "uom", "UOM", "unit"],
  maktx: ["MAKTX", "maktx", "description", "DESCRIPTION", "material_desc"],
};

function pick(row: SapRow, key: keyof typeof FIELD_ALIASES): string | undefined {
  for (const alias of FIELD_ALIASES[key] ?? []) {
    const v = row[alias];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return undefined;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Flatten nested IDoc segment arrays into row objects. */
export function flattenIdocPayload(payload: unknown): SapRow[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenIdocPayload(item));
  }
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  const segmentKeys = ["E1MARAM", "E1MARCM", "E1MCHB", "E1EDL24", "segments", "IDOC", "idoc"];
  for (const key of segmentKeys) {
    if (key in obj) {
      return flattenIdocPayload(obj[key]);
    }
  }

  // Already a flat field bag with at least one SAP-ish key
  const keys = Object.keys(obj);
  if (keys.some((k) => /MATNR|WERKS|CHARG|matnr|werks|charg|sku|plant|lot/i.test(k))) {
    return [obj];
  }

  return [];
}

export function mapSapIdocRecords(records: SapRow[]): SapMapResult {
  const lots: MappedLot[] = [];
  const skuMap = new Map<string, MappedSku>();
  const nodeMap = new Map<string, MappedNode>();
  const seenFields = new Set<string>();

  for (const row of records) {
    Object.keys(row).forEach((k) => seenFields.add(k));
    const matnr = pick(row, "matnr");
    const werks = pick(row, "werks");
    const charg = pick(row, "charg");
    if (!matnr) continue;

    const sku_id = matnr.replace(/^0+/, "") || matnr;
    const node_id = werks ? `PLANT-${werks}` : "PLANT-UNKNOWN";
    const lot_id = charg ? `${sku_id}-${charg}` : `${sku_id}-OPEN`;

    if (!skuMap.has(sku_id)) {
      skuMap.set(sku_id, {
        sku_id,
        description: pick(row, "maktx"),
        uom: pick(row, "meins"),
        plant: werks,
        source: "sap_idoc",
      });
    }
    if (!nodeMap.has(node_id)) {
      nodeMap.set(node_id, {
        node_id,
        name: werks ? `Plant ${werks}` : "Unknown plant",
        node_type: "plant",
        plant: werks,
        source: "sap_idoc",
      });
    }

    lots.push({
      sku_id,
      node_id,
      lot_id,
      qty_on_hand: num(pick(row, "menge")),
      expiry_date: pick(row, "vfdat"),
      manufacturing_date: pick(row, "hsdat"),
      uom: pick(row, "meins"),
      plant: werks,
      material: matnr,
      source: "sap_idoc",
    });
  }

  const knownAliases = new Set(Object.values(FIELD_ALIASES).flat());
  const unmappedFields = Array.from(seenFields).filter((f) => !knownAliases.has(f)).slice(0, 40);

  return {
    engine: "sap-idoc-mapper",
    lots,
    skus: Array.from(skuMap.values()),
    nodes: Array.from(nodeMap.values()),
    unmappedFields,
    summary: {
      lots: lots.length,
      skus: skuMap.size,
      nodes: nodeMap.size,
      rowsIn: records.length,
    },
  };
}
