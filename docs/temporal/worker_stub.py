#!/usr/bin/env python3
"""Minimal Temporal/Hermes-style worker: cron-friendly HTTP client for Yugam autonomy.

Usage:
  export YUGAM_URL=https://sctransformation.netlify.app
  export VPS_WEBHOOK_SECRET=...
  python docs/temporal/worker_stub.py fefo_weekly medtech

Wire this into Temporal as an activity, or run from n8n Execute Command / Hermes cron.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request


def run(workflow_id: str, industry: str = "medtech") -> dict:
    base = os.environ.get("YUGAM_URL", "https://sctransformation.netlify.app").rstrip("/")
    secret = os.environ["VPS_WEBHOOK_SECRET"]
    payload = json.dumps(
        {"workflowId": workflow_id, "industry": industry, "source": "temporal"}
    ).encode()
    req = urllib.request.Request(
        f"{base}/api/autonomy/run",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-vps-secret": secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        return json.loads(res.read().decode())


if __name__ == "__main__":
    wf = sys.argv[1] if len(sys.argv) > 1 else "control_tower_daily"
    ind = sys.argv[2] if len(sys.argv) > 2 else "medtech"
    print(json.dumps(run(wf, ind), indent=2))
