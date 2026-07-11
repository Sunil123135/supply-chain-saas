-- Yugam — combined Supabase migrations (P0 + P1 + P2)
-- Paste into Supabase Dashboard → SQL Editor → Run once
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT patterns where applicable)

-- ═══ 0001 P0 extensions ═══
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS _p0_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note TEXT NOT NULL DEFAULT 'P0 migration applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO _p0_health (note)
SELECT 'Yugam P0–P2 combined migration applied'
WHERE NOT EXISTS (SELECT 1 FROM _p0_health WHERE note LIKE 'Yugam P0%');

-- ═══ 0002 P1 import + core entities ═══
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('medtech', 'cpg', '3pl')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  industry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  sku_id TEXT NOT NULL,
  sku_name TEXT,
  category TEXT,
  subcategory TEXT,
  abc_class TEXT,
  lead_time_days INT,
  data_provenance TEXT DEFAULT 'synthetic',
  UNIQUE (org_id, sku_id)
);

CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  node_id TEXT NOT NULL,
  node_type TEXT,
  city TEXT,
  pincode TEXT,
  UNIQUE (org_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_skus_org ON skus(org_id);
CREATE INDEX IF NOT EXISTS idx_nodes_org ON nodes(org_id);

-- ═══ 0003 P2 operational layer ═══
CREATE TABLE IF NOT EXISTS lots_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  mfg_date DATE,
  expiry_date DATE,
  qty NUMERIC NOT NULL DEFAULT 0,
  node_id TEXT,
  unit_cost_inr NUMERIC,
  data_provenance TEXT DEFAULT 'import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, lot_id)
);

CREATE TABLE IF NOT EXISTS freight_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lane_key TEXT NOT NULL,
  origin_node_id TEXT,
  dest_pincode_prefix TEXT,
  vehicle_type TEXT,
  rate_inr NUMERIC NOT NULL,
  fuel_surcharge_pct NUMERIC DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  UNIQUE (org_id, lane_key)
);

CREATE TABLE IF NOT EXISTS freight_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  shipment_id TEXT,
  carrier_name TEXT,
  lane_key TEXT,
  vehicle_type TEXT,
  billed_inr NUMERIC NOT NULL,
  contract_inr NUMERIC,
  variance_inr NUMERIC,
  status TEXT DEFAULT 'open',
  audit_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, invoice_id)
);

CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input JSONB,
  output JSONB,
  confidence NUMERIC,
  status TEXT NOT NULL DEFAULT 'completed',
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL CHECK (system_type IN ('erp', 'tms', 'wms', 'csv', 'sap_export')),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  full_name TEXT,
  role TEXT DEFAULT 'planner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lots_org_expiry ON lots_inventory(org_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_freight_inv_org ON freight_invoices(org_id, audit_status);
CREATE INDEX IF NOT EXISTS idx_agent_exec_org ON agent_executions(org_id, created_at DESC);

ALTER TABLE lots_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- Done. Next: POST /api/seed/supabase?industry=all with header x-seed-secret
