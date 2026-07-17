import { NextResponse } from "next/server";

import { classifyToolException } from "@/lib/math/exceptions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], configured: false });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "needs_approval";
  const sb = getSupabaseAdmin()!;

  let query = sb
    .from("agent_executions")
    .select("id, org_id, agent_id, tool_name, input, output, confidence, status, requires_approval, approved_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status === "needs_approval") {
    query = query.eq("requires_approval", true).in("status", ["needs_approval", "pending"]);
  } else if (status === "approved") {
    query = query.eq("status", "approved");
  } else if (status === "rejected") {
    query = query.eq("status", "rejected");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
  }

  const items = (data ?? []).map((row) => {
    const out = row.output as {
      summary?: string;
      data?: { summary?: { exposureInr?: number }; recoverableInr?: number };
    } | null;
    const summary = out?.summary ?? `${row.tool_name} · ${row.status}`;
    const exposure =
      out?.data?.summary?.exposureInr ??
      (typeof out?.data?.recoverableInr === "number" ? out.data.recoverableInr : undefined);
    const classified = classifyToolException(row.tool_name, summary, exposure);
    return {
      ...row,
      summary,
      exposureInr: exposure ?? null,
      taxonomy: classified.taxonomy,
      severity: classified.severity,
    };
  });

  return NextResponse.json({
    configured: true,
    count: items.length,
    items,
  });
}
