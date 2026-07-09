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
