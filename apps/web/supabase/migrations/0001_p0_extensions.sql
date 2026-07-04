# Supabase P0 — enable extensions for Drizzle + pgvector (run in SQL Editor)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Placeholder org table (full schema in P1)
CREATE TABLE IF NOT EXISTS _p0_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note TEXT NOT NULL DEFAULT 'P0 migration applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO _p0_health (note) VALUES ('Nexova Flow P0 extensions ready');
