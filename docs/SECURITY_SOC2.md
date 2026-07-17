# Yugam — SOC 2 / ISO 27001 posture (control map)

Sales-ready control narrative and engineering checklist. Formal audit remains external.

## Trust claims

| Control area | Yugam implementation | Evidence |
|--------------|----------------------|----------|
| Access control | Optional `YUGAM_REQUIRE_AUTH`; roles `admin/planner/operator/viewer` | `lib/auth/rbac.ts`, `/login`, middleware |
| Least privilege | Confidence gates by ₹ exposure + role | `confidenceGate()` in `productDepth.ts` |
| Audit logging | `agent_executions` + `audit_events` | migrations `0003`, `0004`; `/audit` UI |
| Encryption in transit | HTTPS (Netlify / Railway) | Platform defaults |
| Secrets | Env only; Slack HMAC preferred | `SLACK_SIGNING_SECRET`, `BOT_SHARED_SECRET` |
| Change management | Git + Railway/Netlify deploys | Deploy docs |
| Availability | Health wiring | `/api/health/wiring` |

## SOC 2 readiness checklist

- [x] Auth gate for product routes
- [x] Role model defined
- [x] Agent execution audit trail
- [x] Approval workflow for high-impact actions
- [x] Slack request signing (HMAC)
- [ ] Formal access reviews (quarterly) — process
- [ ] Penetration test — engage firm
- [ ] Subprocessor list published — legal
- [ ] Incident response runbook drill — ops
- [ ] ISO 27001 SoA draft — GRC

## ISO 27001 mapping (abbrev)

| Annex A theme | Yugam control |
|---------------|---------------|
| A.5 Policies | This doc + SECURITY env templates |
| A.8 Asset mgmt | Org-scoped tables (`org_id`) |
| A.9 Access | RBAC + magic link / demo cookie |
| A.12 Ops security | Autonomy + VPS secrets |
| A.14 Secure development | TypeScript strict + API validators |
| A.16 Incident | Railway/Netlify logs + audit page |

## Customer questionnaire (short)

1. **Where is data stored?** Supabase Postgres (region selectable).
2. **Who can see my data?** Org isolation via `org_id`; service role for server jobs.
3. **Do agents write back to ERP?** Only after approval gates; write-back phased.
4. **Cold-chain / GDP?** Cold-chain module monitors excursions and flags quarantine.
