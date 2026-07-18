-- P4 product depth + enterprise tables
-- Run after 0003_p2_operational.sql

CREATE TABLE IF NOT EXISTS demo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  message TEXT,
  source TEXT DEFAULT 'contact_form',
  crm_status TEXT DEFAULT 'new',
  crm_external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS demo_leads_email_idx ON demo_leads (email);
CREATE INDEX IF NOT EXISTS demo_leads_created_idx ON demo_leads (created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  confidence NUMERIC,
  auto_executed BOOLEAN DEFAULT false,
  payload JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_events_org_idx ON audit_events (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_action_idx ON audit_events (action);

CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  owner_agent_id TEXT NOT NULL,
  cron_hint TEXT,
  kpi_json JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_schedules_org_wf
  ON agent_schedules (org_id, workflow_id);

-- Extend user_profiles roles documentation
COMMENT ON COLUMN user_profiles.role IS 'admin | planner | operator | viewer';

-- Service role bypasses RLS; anon reads blocked until policies added
ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
