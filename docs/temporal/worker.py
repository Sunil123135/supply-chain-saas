#!/usr/bin/env python3
"""Temporal worker for Yugam autonomy workflows.

Calls Netlify POST /api/autonomy/run with x-vps-secret.

Env:
  YUGAM_URL=https://sctransformation.netlify.app
  VPS_WEBHOOK_SECRET=...
  TEMPORAL_HOST=temporal:7233
  TEMPORAL_NAMESPACE=default
  TEMPORAL_TASK_QUEUE=yugam-autonomy
"""

from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
from datetime import timedelta

from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.common import RetryPolicy
from temporalio.worker import Worker

from workflows_catalog import SCHEDULES

YUGAM_URL = os.environ.get("YUGAM_URL", "https://sctransformation.netlify.app").rstrip("/")
SECRET = os.environ.get("VPS_WEBHOOK_SECRET", "")
TASK_QUEUE = os.environ.get("TEMPORAL_TASK_QUEUE", "yugam-autonomy")
# Corporate proxies / SSL inspection: set YUGAM_SSL_VERIFY=false
SSL_VERIFY = os.environ.get("YUGAM_SSL_VERIFY", "true").lower() not in ("0", "false", "no")


def _ssl_context():
    if SSL_VERIFY:
        return None
    import ssl

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


@activity.defn
async def run_yugam_workflow(workflow_id: str, industry: str = "medtech") -> dict:
    if not SECRET:
        raise RuntimeError("VPS_WEBHOOK_SECRET required")
    payload = json.dumps(
        {"workflowId": workflow_id, "industry": industry, "source": "temporal-worker"}
    ).encode()
    req = urllib.request.Request(
        f"{YUGAM_URL}/api/autonomy/run",
        data=payload,
        headers={"Content-Type": "application/json", "x-vps-secret": SECRET},
        method="POST",
    )

    def _call() -> dict:
        try:
            with urllib.request.urlopen(req, timeout=180, context=_ssl_context()) as res:
                return json.loads(res.read().decode())
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            raise RuntimeError(f"Yugam HTTP {e.code}: {body[:500]}") from e

    return await asyncio.to_thread(_call)


@workflow.defn
class YugamAutonomyWorkflow:
    @workflow.run
    async def run(self, workflow_id: str, industry: str = "medtech") -> dict:
        return await workflow.execute_activity(
            run_yugam_workflow,
            args=[workflow_id, industry],
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(maximum_attempts=3),
        )


async def main() -> None:
    host = os.environ.get("TEMPORAL_HOST", "localhost:7233")
    namespace = os.environ.get("TEMPORAL_NAMESPACE", "default")
    client = await Client.connect(host, namespace=namespace)
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[YugamAutonomyWorkflow],
        activities=[run_yugam_workflow],
    )
    known = ", ".join(SCHEDULES.keys())
    print(f"Yugam Temporal worker on {host} queue={TASK_QUEUE}")
    print(f"Known workflows: {known}")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
