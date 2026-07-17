import { getSupabaseAdmin } from "@/lib/supabase/server";
import { confidenceGate } from "@/lib/math/productDepth";
import { canPerform, parseRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const sb = getSupabaseAdmin();
  let events: Array<Record<string, unknown>> = [];
  let executions: Array<Record<string, unknown>> = [];

  if (sb) {
    const [{ data: audit }, { data: agents }] = await Promise.all([
      sb.from("audit_events").select("*").order("created_at", { ascending: false }).limit(40),
      sb
        .from("agent_executions")
        .select("id, agent_id, tool_name, confidence, requires_approval, status, created_at, output")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    events = (audit as Array<Record<string, unknown>>) ?? [];
    executions = (agents as Array<Record<string, unknown>>) ?? [];
  }

  const role = parseRole(process.env.YUGAM_DEMO_ROLE ?? "planner");
  const demoGate = confidenceGate({
    confidence: 0.91,
    requiresApproval: false,
    financialInr: 120000,
    role,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">Governance</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Audit & confidence gates</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-fg)]">
            Immutable agent lineage, role checks, and auto-execute thresholds. Control map:
            <code className="text-xs">docs/SECURITY_SOC2.md</code>.
          </p>
        </div>
        <div className="card-surface text-sm">
          <p className="font-semibold">Demo role: {role}</p>
          <p className="text-[var(--muted-fg)]">
            can approve: {String(canPerform(role, "approve"))} · gate: {demoGate.reason} (threshold{" "}
            {demoGate.threshold})
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Recent agent executions</h2>
        {!sb ? (
          <p className="mt-3 text-sm text-[var(--muted-fg)]">
            Set Supabase service role to load live audit rows. Showing empty state.
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--muted)]/40 text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Tool</th>
                <th className="px-3 py-2">Confidence</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--muted-fg)]" colSpan={5}>
                    No executions yet — run Sarvam or an autonomy workflow.
                  </td>
                </tr>
              ) : (
                executions.map((row) => (
                  <tr key={String(row.id)} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(row.created_at ?? "").slice(0, 19)}
                    </td>
                    <td className="px-3 py-2">{String(row.agent_id)}</td>
                    <td className="px-3 py-2">{String(row.tool_name)}</td>
                    <td className="px-3 py-2">
                      {typeof row.confidence === "number"
                        ? `${Math.round(row.confidence * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{String(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Audit events</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--muted)]/40 text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Auto</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--muted-fg)]" colSpan={5}>
                    Run migration <code>0004_p4_enterprise.sql</code> then approve actions to populate.
                  </td>
                </tr>
              ) : (
                events.map((row) => (
                  <tr key={String(row.id)} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(row.created_at ?? "").slice(0, 19)}
                    </td>
                    <td className="px-3 py-2">
                      {String(row.actor_id ?? "system")} ({String(row.actor_role ?? "—")})
                    </td>
                    <td className="px-3 py-2">{String(row.action)}</td>
                    <td className="px-3 py-2">
                      {String(row.resource_type ?? "")} {String(row.resource_id ?? "")}
                    </td>
                    <td className="px-3 py-2">{String(Boolean(row.auto_executed))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
