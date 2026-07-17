import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    first?: string;
    last?: string;
    company?: string;
    email?: string;
    phone?: string;
    industry?: string;
    message?: string;
  };

  if (!body.first || !body.last || !body.company || !body.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const lead = {
    first_name: body.first,
    last_name: body.last,
    company: body.company,
    email: body.email,
    phone: body.phone ?? null,
    industry: body.industry ?? null,
    message: body.message ?? null,
    source: "contact_form",
    crm_status: "new",
  };

  const sb = getSupabaseAdmin();
  let leadId: string | null = null;
  if (sb) {
    const { data, error } = await sb.from("demo_leads").insert(lead).select("id").single();
    if (!error && data) leadId = data.id as string;
  }

  // Optional CRM webhook (HubSpot / Salesforce / Zapier / n8n)
  const crmUrl = process.env.CRM_WEBHOOK_URL;
  let crmForwarded = false;
  if (crmUrl) {
    try {
      const res = await fetch(crmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRM_WEBHOOK_SECRET
            ? { "x-crm-secret": process.env.CRM_WEBHOOK_SECRET }
            : {}),
        },
        body: JSON.stringify({
          ...lead,
          leadId,
          bookingHint: "Schedule 30-min discovery via Calendly/Teams",
        }),
      });
      crmForwarded = res.ok;
      if (sb && leadId) {
        await sb
          .from("demo_leads")
          .update({
            crm_status: crmForwarded ? "forwarded" : "forward_failed",
            crm_external_id: crmForwarded ? `webhook:${Date.now()}` : null,
          })
          .eq("id", leadId);
      }
    } catch {
      crmForwarded = false;
    }
  }

  return NextResponse.json({
    ok: true,
    leadId,
    persisted: Boolean(leadId),
    crmForwarded,
    message: "Thanks — we'll line up a discovery call within 24 hours.",
  });
}
