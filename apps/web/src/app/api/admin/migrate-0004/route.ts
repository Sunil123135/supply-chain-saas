/**
 * One-time / admin: apply P4 enterprise DDL when tables are missing.
 * Auth: x-seed-secret == SEED_SECRET
 *
 * Prefer running 0004_p4_enterprise.sql in Supabase SQL Editor.
 * This route uses the Supabase SQL API via PostgREST only if a helper RPC exists;
 * otherwise returns the SQL for the operator to paste.
 */
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET;
  const header = req.headers.get("x-seed-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  }

  const sb = getSupabaseAdmin()!;
  const checks = ["audit_events", "agent_schedules", "demo_leads"] as const;
  const missing: string[] = [];
  for (const table of checks) {
    const { error } = await sb.from(table).select("id").limit(1);
    if (error) missing.push(table);
  }

  if (!missing.length) {
    return NextResponse.json({ ok: true, status: "already_applied", tables: checks });
  }

  const sqlPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "0004_p4_enterprise.sql",
  );
  let sql: string;
  try {
    sql = await readFile(sqlPath, "utf8");
  } catch {
    sql = "";
  }

  // Optional helper RPC some projects install — ignore if absent
  const { error: rpcError } = await sb.rpc("exec_sql", { query: sql });
  if (!rpcError) {
    return NextResponse.json({ ok: true, status: "applied_via_rpc", missing });
  }

  return NextResponse.json(
    {
      ok: false,
      status: "manual_required",
      missing,
      hint: "Paste apps/web/supabase/migrations/0004_p4_enterprise.sql into Supabase SQL Editor → Run",
      sql,
    },
    { status: 409 },
  );
}

export async function GET(req: Request) {
  const secret = process.env.SEED_SECRET;
  const header = req.headers.get("x-seed-secret");
  const url = new URL(req.url);
  const q = url.searchParams.get("secret");
  if (!secret || (header !== secret && q !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false });
  }
  const sb = getSupabaseAdmin()!;
  const status: Record<string, string> = {};
  for (const table of ["audit_events", "agent_schedules", "demo_leads"] as const) {
    const { error } = await sb.from(table).select("id").limit(1);
    status[table] = error ? `missing (${error.message})` : "ok";
  }
  return NextResponse.json({ configured: true, tables: status });
}
