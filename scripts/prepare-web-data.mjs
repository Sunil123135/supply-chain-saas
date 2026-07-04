#!/usr/bin/env node
/**
 * Copy starter packs into apps/web/data for Netlify serverless bundles,
 * and emit public/bundled-stats.json for static fallback on the dashboard.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcData = join(root, "data");
const webData = join(root, "apps", "web", "data");
const publicDir = join(root, "apps", "web", "public");

const PACKS = {
  medtech: "medtech-starter-pack",
  cpg: "cpg-india-starter-pack",
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

function packStats(packDir) {
  const read = (name) => {
    const p = join(packDir, name);
    if (!existsSync(p)) return { rows: [] };
    return parseCsv(readFileSync(p, "utf8"));
  };
  const skus = read("sku_master.csv");
  const lots = read("lots_inventory.csv");
  const demand = read("demand_history.csv");
  const orders = read("open_orders.csv");
  const shipments = read("shipments.csv");
  const nodes = read("nodes.csv");
  const today = Date.now();
  const nearExpiryLots = lots.rows.filter((lot) => {
    const exp = lot.expiry_date;
    if (!exp) return false;
    const days = (new Date(exp).getTime() - today) / 86400000;
    return days >= 0 && days <= 60;
  }).length;
  return {
    skuCount: skus.rows.length,
    lotCount: lots.rows.length,
    demandRows: demand.rows.length,
    orderCount: orders.rows.length,
    shipmentCount: shipments.rows.length,
    nodeCount: nodes.rows.length,
    nearExpiryLots,
  };
}

mkdirSync(webData, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const industries = {};
for (const [key, folder] of Object.entries(PACKS)) {
  const src = join(srcData, folder);
  const dest = join(webData, folder);
  cpSync(src, dest, { recursive: true });
  industries[key] = packStats(dest);
}

const payload = {
  mode: "bundled",
  provenance: "starter_pack_build_time",
  loadedAt: new Date().toISOString(),
  industries,
};

writeFileSync(join(publicDir, "bundled-stats.json"), JSON.stringify(payload, null, 2));
console.log("Prepared web data:", JSON.stringify(industries));
