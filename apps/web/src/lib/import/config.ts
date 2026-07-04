export type IndustryPack = "medtech" | "cpg";

export type ImportFileKey =
  | "nodes"
  | "customers"
  | "sku_master"
  | "lots_inventory"
  | "demand_history"
  | "open_orders"
  | "allocation_rules"
  | "shipments";

export interface ImportFileSpec {
  key: ImportFileKey;
  filename: string;
  label: string;
  required: boolean;
  order: number;
}

export const IMPORT_FILES: ImportFileSpec[] = [
  { key: "nodes", filename: "nodes.csv", label: "Nodes (plants, DCs, CFAs)", required: true, order: 1 },
  { key: "customers", filename: "customers.csv", label: "Customers / distributors", required: true, order: 2 },
  { key: "sku_master", filename: "sku_master.csv", label: "SKU master", required: true, order: 3 },
  { key: "lots_inventory", filename: "lots_inventory.csv", label: "Lots & inventory (FEFO)", required: false, order: 4 },
  { key: "demand_history", filename: "demand_history.csv", label: "Demand history", required: false, order: 5 },
  { key: "open_orders", filename: "open_orders.csv", label: "Open orders", required: false, order: 6 },
  { key: "allocation_rules", filename: "allocation_rules.csv", label: "Allocation rules", required: false, order: 7 },
  { key: "shipments", filename: "shipments.csv", label: "Shipments / dispatch", required: false, order: 8 },
];

export const REQUIRED_HEADERS: Record<ImportFileKey, string[]> = {
  nodes: ["node_id", "node_type", "city", "pincode"],
  customers: ["customer_id", "tier", "name", "city"],
  sku_master: ["sku_id", "sku_name", "category", "unit_cost_inr", "lead_time_days", "abc_class"],
  lots_inventory: ["sku_id", "lot_id", "qty", "node_id"],
  demand_history: ["sku_id", "week_start", "qty"],
  open_orders: ["order_id", "customer_id", "sku_id", "qty"],
  allocation_rules: ["rule_id", "customer_tier", "sku_abc_class", "max_shortage_pct"],
  shipments: ["shipment_id", "origin_node_id", "dest_pincode", "status"],
};

export const PACK_PATHS: Record<IndustryPack, string> = {
  medtech: "medtech-starter-pack",
  cpg: "cpg-india-starter-pack",
};
