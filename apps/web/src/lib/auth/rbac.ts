import { timingSafeEqual, createHmac } from "crypto";

/** Constant-time string compare. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verify Slack request signature (v0).
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(opts: {
  signingSecret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  maxAgeSec?: number;
}): { ok: boolean; reason?: string } {
  const { signingSecret, timestamp, signature, rawBody } = opts;
  if (!timestamp || !signature) {
    return { ok: false, reason: "missing_slack_headers" };
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
  const age = Math.abs(Date.now() / 1000 - ts);
  if (age > (opts.maxAgeSec ?? 60 * 5)) {
    return { ok: false, reason: "timestamp_too_old" };
  }
  const base = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${digest}`;
  if (!safeEqual(expected, signature)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

export type OrgRole = "admin" | "planner" | "operator" | "viewer";

const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 1,
  operator: 2,
  planner: 3,
  admin: 4,
};

export function parseRole(value: string | null | undefined): OrgRole {
  const v = (value ?? "planner").toLowerCase();
  if (v === "admin" || v === "planner" || v === "operator" || v === "viewer") return v;
  return "planner";
}

export function roleAtLeast(role: OrgRole, min: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Permission matrix for enterprise RBAC. */
export function canPerform(role: OrgRole, action: "read" | "run_tool" | "approve" | "admin"): boolean {
  switch (action) {
    case "read":
      return true;
    case "run_tool":
      return roleAtLeast(role, "operator");
    case "approve":
      return roleAtLeast(role, "planner");
    case "admin":
      return role === "admin";
    default: {
      const _exhaustive: never = action;
      return Boolean(_exhaustive);
    }
  }
}
