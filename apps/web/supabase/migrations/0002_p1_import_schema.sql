-- P1 import + core entities (run after 0001 in Supabase SQL Editor)

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
