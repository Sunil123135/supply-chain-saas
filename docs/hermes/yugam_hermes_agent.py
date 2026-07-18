#!/usr/bin/env python3
"""Yugam ↔ Hermes bridge agent (run on VPS or beside Hermes).

Pulls the SaaS agent card, then runs workflows / roles against Railway.

Env:
  YUGAM_URL          default https://nexova-web-production.up.railway.app
  VPS_WEBHOOK_SECRET shared secret (x-vps-secret)
  YUGAM_INDUSTRY     medtech | cpg
  YUGAM_SSL_VERIFY   true|false (corporate SSL inspection)

Examples:
  python yugam_hermes_agent.py manifest
  python yugam_hermes_agent.py role orchestrator
  python yugam_hermes_agent.py workflow sensing_indent_daily
  python yugam_hermes_agent.py chat "which lots expire soon?"
  python yugam_hermes_agent.py cron-once   # runs due scheduleHints (best-effort)
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.request

DEFAULT_URL = "https://nexova-web-production.up.railway.app"


def _ssl_ctx() -> ssl.SSLContext | None:
    if os.environ.get("YUGAM_SSL_VERIFY", "true").lower() in ("0", "false", "no"):
        return ssl._create_unverified_context()
    return None


def request(method: str, path: str, body: dict | None = None) -> dict:
    base = os.environ.get("YUGAM_URL", DEFAULT_URL).rstrip("/")
    secret = os.environ.get("VPS_WEBHOOK_SECRET") or os.environ.get("HERMES_SHARED_SECRET") or ""
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{base}{path}",
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            **({"x-vps-secret": secret, "x-hermes-secret": secret} if secret else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=120) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code}: {payload}") from e


def cmd_manifest(_: argparse.Namespace) -> None:
    print(json.dumps(request("GET", "/api/integrations/hermes"), indent=2))


def cmd_role(args: argparse.Namespace) -> None:
    industry = os.environ.get("YUGAM_INDUSTRY", "medtech")
    out = request(
        "POST",
        "/api/integrations/hermes",
        {"action": "run_role", "role": args.role, "industry": industry, "notify": True},
    )
    print(json.dumps(out, indent=2))


def cmd_workflow(args: argparse.Namespace) -> None:
    industry = os.environ.get("YUGAM_INDUSTRY", "medtech")
    out = request(
        "POST",
        "/api/integrations/hermes",
        {
            "action": "run_workflow",
            "workflowId": args.workflow_id,
            "industry": industry,
            "notify": True,
        },
    )
    print(json.dumps(out, indent=2))


def cmd_chat(args: argparse.Namespace) -> None:
    industry = os.environ.get("YUGAM_INDUSTRY", "medtech")
    out = request(
        "POST",
        "/api/integrations/hermes",
        {"action": "chat", "prompt": args.prompt, "industry": industry},
    )
    print(json.dumps(out, indent=2))


def cmd_cron_once(_: argparse.Namespace) -> None:
    """Fire high-value daily roles once (use system cron / Hermes scheduler for real cadence)."""
    industry = os.environ.get("YUGAM_INDUSTRY", "medtech")
    roles = [
        "replenishment_controller",
        "plant_controller",
        "visibility_controller",
        "execution_controller",
        "orchestrator",
    ]
    results = []
    for role in roles:
        try:
            out = request(
                "POST",
                "/api/integrations/hermes",
                {"action": "run_role", "role": role, "industry": industry},
            )
            results.append({"role": role, "ok": True, "summary": out.get("summary")})
        except SystemExit as e:
            results.append({"role": role, "ok": False, "error": str(e)})
    print(json.dumps(results, indent=2))


def main() -> None:
    p = argparse.ArgumentParser(description="Yugam Hermes bridge")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("manifest")
    r = sub.add_parser("role")
    r.add_argument("role")
    w = sub.add_parser("workflow")
    w.add_argument("workflow_id")
    c = sub.add_parser("chat")
    c.add_argument("prompt")
    sub.add_parser("cron-once")

    args = p.parse_args()
    {
        "manifest": cmd_manifest,
        "role": cmd_role,
        "workflow": cmd_workflow,
        "chat": cmd_chat,
        "cron-once": cmd_cron_once,
    }[args.cmd](args)


if __name__ == "__main__":
    main()
