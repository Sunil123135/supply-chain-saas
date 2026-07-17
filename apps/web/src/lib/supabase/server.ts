import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!admin) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
    admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export async function logAgentExecution(entry: {
  org_id?: string;
  user_id?: string;
  agent_id: string;
  tool_name: string;
  input: unknown;
  output: unknown;
  confidence?: number;
  status?: string;
  requires_approval?: boolean;
}) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from("agent_executions")
    .insert({
      org_id: entry.org_id ?? null,
      user_id: entry.user_id ?? null,
      agent_id: entry.agent_id,
      tool_name: entry.tool_name,
      input: entry.input,
      output: entry.output,
      confidence: entry.confidence ?? null,
      status: entry.status ?? "completed",
      requires_approval: entry.requires_approval ?? false,
    })
    .select("id")
    .single();
  if (error) return null;
  return data?.id as string;
}

/** SOC2-oriented audit trail (migration 0004 audit_events). */
export async function logAuditEvent(entry: {
  org_id?: string | null;
  actor_id?: string;
  actor_role?: string;
  action: string;
  resource_type?: string;
  resource_id?: string | null;
  confidence?: number;
  auto_executed?: boolean;
  payload?: unknown;
}) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from("audit_events")
    .insert({
      org_id: entry.org_id ?? null,
      actor_id: entry.actor_id ?? null,
      actor_role: entry.actor_role ?? null,
      action: entry.action,
      resource_type: entry.resource_type ?? null,
      resource_id: entry.resource_id ?? null,
      confidence: entry.confidence ?? null,
      auto_executed: entry.auto_executed ?? false,
      payload: entry.payload ?? {},
    })
    .select("id")
    .single();
  if (error) return null;
  return data?.id as string;
}
